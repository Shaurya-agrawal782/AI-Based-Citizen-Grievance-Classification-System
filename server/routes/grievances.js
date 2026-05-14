const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const Grievance = require('../models/Grievance');
const { auth, requireRole } = require('../middleware/auth');
const { analyzeGrievance } = require('../utils/geminiAI');
const { createAuditEntry, createCaseHistoryEntry, appendAuditLog, appendCaseHistory } = require('../utils/auditLogger');
const { cloudinary, isConfigured: isCloudinaryConfigured } = require('../config/cloudinary');

const router = express.Router();

const resolutionProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for resolution proof'));
    }
    cb(null, true);
  }
});

const parseResolutionProofUpload = (req, res, next) => {
  resolutionProofUpload.array('images', 8)(req, res, (error) => {
    if (!error) return next();

    const message = error instanceof multer.MulterError
      ? `Upload failed: ${error.message}`
      : error.message || 'Upload failed';

    return res.status(400).json({ error: message });
  });
};

// Multer for grievance creation (optional image upload — live geo-tagged evidence)
const grievanceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 10 * 1024 * 1024  // 10 MB for high-res camera photos
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed as evidence'));
    }
    cb(null, true);
  }
});

const parseGrievanceUpload = (req, res, next) => {
  grievanceUpload.fields([
    { name: 'liveEvidence', maxCount: 3 },
    { name: 'images', maxCount: 8 }
  ])(req, res, (error) => {
    if (!error) return next();
    const message = error instanceof multer.MulterError
      ? `Evidence upload failed: ${error.message}`
      : error.message || 'Evidence upload failed';
    return res.status(400).json({ error: message });
  });
};

const uploadImageToCloudinary = (file, folder) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: 'image'
    },
    (error, result) => {
      if (error) return reject(error);
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname,
        format: result.format || file.mimetype?.split('/')[1] || 'jpeg',
        bytes: result.bytes || file.size,
        uploadedAt: new Date()
      });
    }
  );

  stream.end(file.buffer);
});

const sanitizeFileName = (name = 'evidence') => (
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'evidence'
);

const saveLocalEvidenceImage = async (file, folder, req) => {
  const relativeFolder = folder.replace(/^civictrust\/?/, '').replace(/\\/g, '/');
  const uploadDir = path.join(__dirname, '..', 'uploads', relativeFolder);
  const format = file.mimetype?.split('/')[1] || path.extname(file.originalname || '').replace('.', '') || 'jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${sanitizeFileName(file.originalname)}.${format}`;

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);

  const publicPath = `/uploads/${relativeFolder}/${filename}`.replace(/\\/g, '/');
  return {
    url: `${req.protocol}://${req.get('host')}${publicPath}`,
    publicId: `local/${relativeFolder}/${filename}`,
    originalName: file.originalname,
    format,
    bytes: file.size,
    uploadedAt: new Date()
  };
};

const uploadEvidenceImage = async (file, folder, req) => {
  if (isCloudinaryConfigured) {
    try {
      return await uploadImageToCloudinary(file, folder);
    } catch (error) {
      console.error('[grievance] Cloudinary upload failed, storing locally:', error.message);
    }
  }

  return saveLocalEvidenceImage(file, folder, req);
};

const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);

const parseJsonField = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const toNumberOrUndefined = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const toBooleanOrUndefined = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return undefined;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const number = toNumberOrUndefined(value);
    if (number !== undefined) return number;
  }
  return undefined;
};

const normalizeEvidenceAuthenticity = (rawAuthenticity, rawGeoTag, evidenceCount = 0) => {
  if (!rawAuthenticity || typeof rawAuthenticity !== 'object') return undefined;

  const score = toNumberOrUndefined(rawAuthenticity.score);
  return {
    score,
    status: cleanString(rawAuthenticity.status) || undefined,
    riskLevel: cleanString(rawAuthenticity.riskLevel) || undefined,
    signals: Array.isArray(rawAuthenticity.signals) ? rawAuthenticity.signals.map(cleanString).filter(Boolean) : [],
    warnings: Array.isArray(rawAuthenticity.warnings) ? rawAuthenticity.warnings.map(cleanString).filter(Boolean) : [],
    challengePrompt: cleanString(rawAuthenticity.challengePrompt) || undefined,
    challengeCompleted: toBooleanOrUndefined(rawAuthenticity.challengeCompleted) ?? false,
    usedLiveCamera: toBooleanOrUndefined(rawAuthenticity.usedLiveCamera) ?? true,
    // TODO: query existing evidenceFingerprint values and set duplicateRisk=true when a repeat is found.
    duplicateRisk: toBooleanOrUndefined(rawAuthenticity.duplicateRisk) ?? false,
    aiRelevance: cleanString(rawAuthenticity.aiRelevance) || 'Pending',
    screenSpoofRisk: cleanString(rawAuthenticity.screenSpoofRisk) || undefined,
    spoofScore: toNumberOrUndefined(rawAuthenticity.spoofScore),
    spoofSignals: Array.isArray(rawAuthenticity.spoofSignals) ? rawAuthenticity.spoofSignals.map(cleanString).filter(Boolean) : [],
    spoofWarnings: Array.isArray(rawAuthenticity.spoofWarnings) ? rawAuthenticity.spoofWarnings.map(cleanString).filter(Boolean) : [],
    evidenceCount: toNumberOrUndefined(rawAuthenticity.evidenceCount) ?? evidenceCount,
    geoTag: rawGeoTag || undefined
  };
};

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const query = req.user.role === 'citizen' ? { citizen: req.userId } : {};

    const [total, submitted, inReview, inProgress, resolved, escalated, highPriority] = await Promise.all([
      Grievance.countDocuments(query),
      Grievance.countDocuments({ ...query, status: 'submitted' }),
      Grievance.countDocuments({ ...query, status: 'in-review' }),
      Grievance.countDocuments({ ...query, status: 'in-progress' }),
      Grievance.countDocuments({ ...query, status: { $in: ['resolved', 'closed'] } }),
      Grievance.countDocuments({ ...query, status: 'escalated' }),
      Grievance.countDocuments({ ...query, priority: 'high' })
    ]);

    const aiClassified = await Grievance.countDocuments({
      ...query,
      'aiClassification.suggestedDepartment': { $ne: null }
    });

    // Category distribution
    const categoryStats = await Grievance.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Priority distribution
    const priorityStats = await Grievance.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Grievance.aggregate([
      { $match: { ...query, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Department performance
    const departmentStats = await Grievance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      total,
      submitted,
      inReview,
      inProgress,
      resolved,
      escalated,
      highPriority,
      aiClassified,
      pendingReview: submitted + inReview,
      categoryStats,
      priorityStats,
      monthlyTrends,
      departmentStats,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new grievance (accepts optional multipart/form-data with images[] for live geo-tagged evidence)
router.post('/', auth, parseGrievanceUpload, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      dateOfIncident,
      citizenPhone,
      coordinates,
      privacyConsent,
      privacyConsentAt,
      locationSource, // GPS | QR | Manual
      locationDetected // { lat, lng, accuracy, address, landmark, city, state, pincode, source }
    } = req.body;

    // Advanced AI Analysis (Gemini)
    const aiResult = await analyzeGrievance(title, description);

    // Map category to department
    const categoryDeptMap = {
      'Public Infrastructure': 'Public Works',
      'Sanitation & Waste': 'Sanitation',
      'Water Supply': 'Water Authority',
      'Electricity': 'Electricity Board',
      'Public Safety': 'Municipal Safety',
      'Other': 'Manual Review Desk'
    };

    const normalizedConfidence = Number(aiResult.confidence);
    const lowConfidence = Number.isFinite(normalizedConfidence) && normalizedConfidence < 40;
    const aiNeedsManualReview = aiResult.requiresHumanReview && (lowConfidence || aiResult.confidenceBand === 'Low')
      || aiResult.category === 'Other'
      || aiResult.suggestedDepartment === 'Manual Review Desk';

    const mappedAiCategory = aiResult.category || Object.keys(categoryDeptMap).find(
      k => categoryDeptMap[k] === aiResult.suggestedDepartment
    );
    const finalCategory = aiNeedsManualReview ? (category || 'Other') : (category || mappedAiCategory || 'Other');
    const finalDepartment = aiNeedsManualReview ? 'Manual Review Desk' : (aiResult.suggestedDepartment || categoryDeptMap[finalCategory] || 'Manual Review Desk');

    // Parse location data (could be string or object). Keep legacy coordinates while
    // also storing top-level lat/lng for newer clients.
    const parsedLocation = parseJsonField(location, location);
    const parsedLocationDetected = parseJsonField(locationDetected, null);

    let locationObject = {};
    if (typeof parsedLocation === 'string') {
      locationObject.address = cleanString(parsedLocation);
    } else if (parsedLocation && typeof parsedLocation === 'object') {
      locationObject = { ...parsedLocation };
    }

    const detectedLocation = parsedLocationDetected && typeof parsedLocationDetected === 'object' ? parsedLocationDetected : null;
    if (detectedLocation) {
      locationObject.landmark = cleanString(detectedLocation.landmark) || locationObject.landmark;
      locationObject.address = cleanString(detectedLocation.address) || locationObject.address;
      locationObject.city = cleanString(detectedLocation.city) || locationObject.city;
      locationObject.state = cleanString(detectedLocation.state) || locationObject.state;
      locationObject.area = cleanString(detectedLocation.area) || locationObject.area;
      locationObject.ward = cleanString(detectedLocation.ward) || locationObject.ward;
      locationObject.zone = cleanString(detectedLocation.zone) || locationObject.zone;
      locationObject.accuracy = toNumberOrUndefined(detectedLocation.accuracy) ?? locationObject.accuracy;
      locationObject.source = detectedLocation.source || locationSource || locationObject.source;
      locationObject.detectedAt = new Date();

      // Part G: Prefer manual pincode from client over geocoder pincode
      const manualPincode = cleanString(detectedLocation.pincode);
      if (manualPincode) locationObject.pincode = manualPincode;

      // Part G: Save geocoder suggestion vs citizen-confirmed address separately
      if (detectedLocation.suggestedAddress) {
        locationObject.suggestedAddress = cleanString(detectedLocation.suggestedAddress);
      }
      if (detectedLocation.displayAddress) {
        locationObject.displayAddress = cleanString(detectedLocation.displayAddress);
      }
      if (detectedLocation.finalAddress) {
        locationObject.finalAddress = cleanString(detectedLocation.finalAddress);
      }
      locationObject.confirmedByUser = toBooleanOrUndefined(detectedLocation.confirmedByUser) ?? false;
    } else if (coordinates) {
      locationObject.coordinates = parseJsonField(coordinates, coordinates);
    } else if (typeof parsedLocation === 'string' && parsedLocation.includes(',')) {
      const [lat, lng] = parsedLocation.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        locationObject.coordinates = { lat, lng };
      }
    }

    const lat = firstNumber(
      locationObject.lat,
      detectedLocation?.lat,
      locationObject.coordinates?.lat,
      detectedLocation?.coordinates?.lat
    );
    const lng = firstNumber(
      locationObject.lng,
      detectedLocation?.lng,
      locationObject.coordinates?.lng,
      detectedLocation?.coordinates?.lng
    );

    if (lat !== undefined && lng !== undefined) {
      locationObject.lat = lat;
      locationObject.lng = lng;
      locationObject.coordinates = { lat, lng };
    }

    const accuracy = toNumberOrUndefined(locationObject.accuracy);
    if (accuracy !== undefined) {
      locationObject.accuracy = accuracy;
    }

    locationObject.source = locationObject.source || locationSource || 'Manual';

    // --- Live geo-tagged evidence: upload files to Cloudinary if present ---
    const uploadedEvidenceImages = [];
    const uploadedAttachments = [];
    const liveEvidenceFiles = req.files?.liveEvidence || [];
    const uploadedFiles = req.files?.images || [];

    // Parse the geoTag JSON sent alongside the file upload
    let parsedGeoTag = null;
    if (req.body.liveEvidenceGeoTag) {
      try {
        parsedGeoTag = JSON.parse(req.body.liveEvidenceGeoTag);
      } catch (_) {
        // Malformed JSON — ignore, still allow submission
      }
    }

    let parsedAuthenticity = null;
    if (req.body.evidenceAuthenticity) {
      try {
        parsedAuthenticity = JSON.parse(req.body.evidenceAuthenticity);
      } catch (_) {
        // Malformed JSON, ignore and still allow submission.
      }
    }

    const normalizedLiveGeoTag = parsedGeoTag ? {
      lat: toNumberOrUndefined(parsedGeoTag.lat),
      lng: toNumberOrUndefined(parsedGeoTag.lng),
      accuracy: toNumberOrUndefined(parsedGeoTag.accuracy),
      capturedAt: parsedGeoTag.capturedAt ? new Date(parsedGeoTag.capturedAt) : new Date(),
      source: parsedGeoTag.source || 'GPS',
      landmark: cleanString(parsedGeoTag.landmark) || '',
      address: cleanString(parsedGeoTag.address) || ''
    } : undefined;

    const normalizedAuthenticity = normalizeEvidenceAuthenticity(
      parsedAuthenticity,
      normalizedLiveGeoTag,
      liveEvidenceFiles.length
    );
    const evidenceFingerprint = cleanString(req.body.evidenceFingerprint) || '';

    for (const [index, liveEvidenceFile] of liveEvidenceFiles.entries()) {
      const uploaded = await uploadEvidenceImage(liveEvidenceFile, 'civictrust/grievances/live-evidence', req);
      uploadedEvidenceImages.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        originalName: uploaded.originalName,
        format: uploaded.format || liveEvidenceFile.mimetype?.split('/')[1] || 'jpeg',
        bytes: uploaded.bytes || liveEvidenceFile.size,
        uploadedAt: uploaded.uploadedAt || new Date(),
        evidenceType: 'LIVE_GEO_TAGGED',
        verifiedLiveCapture: true,
        evidenceFingerprint,
        geoTag: normalizedLiveGeoTag,
        authenticity: normalizedAuthenticity
          ? {
              ...normalizedAuthenticity,
              signals: [
                ...(normalizedAuthenticity.signals || []),
                liveEvidenceFiles.length > 1 ? `Frame ${index + 1} of ${liveEvidenceFiles.length}` : 'Single live evidence frame'
              ]
            }
          : undefined
      });
      uploadedAttachments.push({
        filename: liveEvidenceFile.originalname,
        path: uploaded.url,
        mimetype: liveEvidenceFile.mimetype
      });
    }

    for (const file of uploadedFiles) {
      const uploaded = await uploadEvidenceImage(file, 'civictrust/grievances/uploads', req);
      uploadedEvidenceImages.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        originalName: uploaded.originalName,
        format: uploaded.format || file.mimetype?.split('/')[1] || 'jpeg',
        bytes: uploaded.bytes || file.size,
        uploadedAt: uploaded.uploadedAt || new Date(),
        evidenceType: 'UPLOAD',
        verifiedLiveCapture: false
      });
      uploadedAttachments.push({
        filename: file.originalname,
        path: uploaded.url,
        mimetype: file.mimetype
      });
    }

    const grievance = new Grievance({
      title,
      description,
      category: finalCategory,
      department: finalDepartment,
      priority: aiResult.priority || 'medium',
      location: locationObject,
      locationSource: locationObject.source || locationSource || 'Manual',
      dateOfIncident: dateOfIncident || new Date(),
      citizen: req.userId,
      citizenName: req.user.name,
      citizenEmail: req.user.email,
      citizenPhone: citizenPhone || req.user.phone,
      aiClassification: aiResult,
      privacyConsent: privacyConsent || false,
      privacyConsentAt: privacyConsentAt || null,
      attachments: uploadedAttachments,
      evidenceImages: uploadedEvidenceImages
    });

    // --- AUDIT: Grievance Created ---
    const citizenActor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "GRIEVANCE_CREATED",
      performedBy: citizenActor,
      newValue: { status: 'submitted', category: finalCategory, priority: aiResult.priority || 'medium', department: finalDepartment, locationSource: locationObject.source || 'Manual' },
      reason: `Citizen submitted grievance via CivicTrust portal${uploadedEvidenceImages.length > 0 ? ' with live geo-tagged evidence' : ''}`
    }));

    // --- AUDIT: AI Classification Applied ---
    appendAuditLog(grievance, createAuditEntry({
      action: "AI_CLASSIFICATION_APPLIED",
      systemGenerated: true,
      newValue: { department: finalDepartment, confidence: aiResult.confidence, priority: aiResult.priority },
      reason: "AI intelligence pipeline classified grievance on submission"
    }));

    // --- Case History: Submitted (citizen visible) ---
    appendCaseHistory(grievance, createCaseHistoryEntry({
      status: 'submitted',
      note: 'Your grievance has been successfully submitted.',
      actor: { name: 'CivicTrust System', role: 'system' },
      visibility: 'citizen'
    }));

    // --- Case History: AI classified (citizen visible) ---
    appendCaseHistory(grievance, createCaseHistoryEntry({
      status: 'submitted',
      note: aiNeedsManualReview
        ? 'Your complaint needs more details, so it has been sent to manual review before final routing.'
        : `AI has classified your complaint as "${finalCategory}" and routed it to "${finalDepartment}".`,
      actor: { name: 'CivicTrust AI', role: 'system' },
      visibility: 'citizen'
    }));

    await grievance.save();

    res.status(201).json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all grievances (filtered by role)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, category, department, page = 1, limit = 20, search } = req.query;

    let query = {};

    if (req.user.role === 'citizen') {
      query.citizen = req.userId;
    }

    if (req.user.role === 'department' && req.user.department) {
      query.department = req.user.department;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { trackingId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [grievances, total] = await Promise.all([
      Grievance.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('citizen', 'name email'),
      Grievance.countDocuments(query)
    ]);

    res.json({
      grievances,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single grievance (role-filtered audit trail)
router.get('/:id', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id)
      .populate('citizen', 'name email phone');

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (req.user.role === 'citizen' && grievance.citizen._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For citizens: filter caseHistory by visibility, exclude raw auditTrail
    if (req.user.role === 'citizen') {
      const citizenGrievance = grievance.toObject();
      citizenGrievance.caseHistory = (citizenGrievance.caseHistory || []).filter(
        e => e.visibility === 'citizen' || e.visibility === 'public'
      );
      delete citizenGrievance.auditTrail; // never expose to citizens
      return res.json({ grievance: citizenGrievance });
    }

    // Admins/department see everything
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track grievance by tracking ID (public)
router.get('/track/:trackingId', async (req, res) => {
  try {
    const grievance = await Grievance.findOne({ trackingId: req.params.trackingId })
      .select('trackingId title category department priority status timeline caseHistory attachments resolutionProof feedback createdAt updatedAt');

    if (!grievance) {
      return res.status(404).json({ error: 'No grievance found with this tracking ID' });
    }

    // Only expose public/citizen-visible case history in public tracking
    const result = grievance.toObject();
    result.caseHistory = (result.caseHistory || []).filter(
      e => e.visibility === 'public' || e.visibility === 'citizen'
    );

    res.json({ grievance: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update grievance status (admin/department only)
router.patch('/:id/status', auth, requireRole('admin', 'department'), async (req, res) => {
  try {
    const { status, note, reason } = req.body;
    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const oldStatus = grievance.status;
    grievance.status = status;
    grievance.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      timestamp: new Date(),
      updatedBy: req.userId
    });

    // --- AUDIT: Status Updated ---
    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "STATUS_UPDATED",
      performedBy: actor,
      oldValue: { status: oldStatus },
      newValue: { status },
      reason: reason || note || `Status updated to ${status} by authorized user`
    }));

    // --- Case History (citizen-visible for key transitions) ---
    const citizenVisibleStatuses = ['in-review', 'in-progress', 'resolved', 'closed', 'reopened', 'escalated'];
    if (citizenVisibleStatuses.includes(status)) {
      appendCaseHistory(grievance, createCaseHistoryEntry({
        status,
        note: note || `Your complaint status has been updated to "${status}".`,
        actor: { name: req.user.name, role: req.user.role },
        visibility: 'citizen'
      }));
    }

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload resolution proof (admin/department only)
router.post('/:id/resolution-proof', auth, requireRole('admin', 'department'), parseResolutionProofUpload, async (req, res) => {
  try {
    const note = cleanString(req.body.note) || '';
    const files = req.files || [];

    if (!note && files.length === 0) {
      return res.status(400).json({ error: 'Resolution note or at least one image is required' });
    }

    if (files.length > 0 && !isCloudinaryConfigured) {
      return res.status(503).json({ error: 'Cloudinary is not configured. Resolution proof images cannot be uploaded.' });
    }

    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const uploadedImages = files.length > 0
      ? await Promise.all(files.map(file => uploadImageToCloudinary(file, 'civictrust/grievances/resolution')))
      : [];

    if (!grievance.resolutionProof) {
      grievance.resolutionProof = { images: [] };
    }

    if (!Array.isArray(grievance.resolutionProof.images)) {
      grievance.resolutionProof.images = [];
    }

    grievance.resolutionProof.images.push(...uploadedImages);
    grievance.resolutionProof.note = note || grievance.resolutionProof.note;
    grievance.resolutionProof.uploadedBy = req.userId;
    grievance.resolutionProof.uploadedAt = new Date();

    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "RESOLUTION_PROOF_UPLOADED",
      performedBy: actor,
      newValue: {
        imagesUploaded: uploadedImages.length,
        totalImages: grievance.resolutionProof.images.length,
        note: note ? '[provided]' : '[unchanged]'
      },
      reason: "Officer uploaded resolution proof for citizen review"
    }));

    appendCaseHistory(grievance, createCaseHistoryEntry({
      status: grievance.status,
      note: 'Resolution proof uploaded',
      actor: { name: req.user.name, role: req.user.role },
      visibility: 'citizen'
    }));

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign grievance to department (admin only)
router.patch('/:id/assign', auth, requireRole('admin'), async (req, res) => {
  try {
    const { department } = req.body;
    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const oldDepartment = grievance.department;
    grievance.department = department;
    grievance.status = 'in-review';
    grievance.timeline.push({
      status: 'in-review',
      note: `Assigned to ${department} department`,
      timestamp: new Date(),
      updatedBy: req.userId
    });

    // --- AUDIT: Assigned ---
    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "GRIEVANCE_ASSIGNED",
      performedBy: actor,
      oldValue: { department: oldDepartment },
      newValue: { department, status: 'in-review' },
      reason: "Assigned for resolution by administrator"
    }));

    appendCaseHistory(grievance, createCaseHistoryEntry({
      status: 'in-review',
      note: `Your complaint has been assigned to the ${department} department and is under review.`,
      actor: { name: req.user.name, role: req.user.role },
      visibility: 'citizen'
    }));

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit feedback (citizen only)
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const { rating, satisfied, comment } = req.body;
    const parsedRating = Number(rating);
    const satisfiedFromRequest = toBooleanOrUndefined(satisfied);
    const finalSatisfied = satisfiedFromRequest !== undefined
      ? satisfiedFromRequest
      : parsedRating >= 4
        ? true
        : parsedRating <= 2
          ? false
          : undefined;

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number from 1 to 5' });
    }

    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (grievance.citizen.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the filing citizen can provide feedback' });
    }

    const oldStatus = grievance.status;
    grievance.feedback = {
      rating: parsedRating,
      satisfied: finalSatisfied,
      comment: cleanString(comment) || '',
      submittedAt: new Date()
    };

    // --- AUDIT: Citizen Feedback ---
    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "CITIZEN_FEEDBACK_RECEIVED",
      performedBy: actor,
      newValue: { rating: parsedRating, satisfied: finalSatisfied, comment: comment ? '[provided]' : '[none]' },
      reason: `Citizen provided feedback with rating ${parsedRating}/5`
    }));

    if (finalSatisfied === true) {
      grievance.status = 'closed';
      grievance.timeline.push({
        status: 'closed',
        note: 'Complaint closed after positive citizen feedback',
        timestamp: new Date()
      });
      appendAuditLog(grievance, createAuditEntry({
        action: "GRIEVANCE_CLOSED",
        performedBy: actor,
        oldValue: { status: oldStatus },
        newValue: { status: 'closed' },
        reason: "Complaint closed after satisfied citizen feedback"
      }));
      appendCaseHistory(grievance, createCaseHistoryEntry({
        status: 'closed',
        note: 'Thank you for your feedback! Your complaint has been closed successfully.',
        actor: { name: 'CivicTrust System', role: 'system' },
        visibility: 'citizen'
      }));
    } else if (finalSatisfied === false) {
      grievance.status = 'reopened';
      grievance.timeline.push({
        status: 'reopened',
        note: 'Citizen reopened complaint due to unsatisfactory resolution',
        timestamp: new Date()
      });
      appendAuditLog(grievance, createAuditEntry({
        action: "GRIEVANCE_REOPENED_BY_CITIZEN",
        performedBy: actor,
        oldValue: { status: oldStatus },
        newValue: { status: 'reopened' },
        reason: "Citizen was not satisfied with the resolution"
      }));
      appendCaseHistory(grievance, createCaseHistoryEntry({
        status: 'reopened',
        note: 'Citizen reopened complaint due to unsatisfactory resolution',
        actor: { name: 'CivicTrust System', role: 'system' },
        visibility: 'citizen'
      }));
    }

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Escalate grievance (admin only)
router.patch('/:id/escalate', auth, requireRole('admin'), async (req, res) => {
  try {
    const { note } = req.body;
    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    grievance.status = 'escalated';
    grievance.priority = 'high';
    grievance.timeline.push({
      status: 'escalated',
      note: note || 'Escalated to higher authority for immediate action',
      timestamp: new Date(),
      updatedBy: req.userId
    });

    // --- AUDIT: Escalated ---
    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "GRIEVANCE_ESCALATED",
      performedBy: actor,
      newValue: { status: 'escalated', priority: 'high' },
      reason: note || "Escalated to higher authority for immediate action"
    }));

    appendCaseHistory(grievance, createCaseHistoryEntry({
      status: 'escalated',
      note: 'Your complaint has been escalated to a senior authority for urgent action.',
      actor: { name: req.user.name, role: req.user.role },
      visibility: 'citizen'
    }));

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually reopen grievance (admin/department)
router.patch('/:id/reopen', auth, requireRole('admin', 'department'), async (req, res) => {
  try {
    const { note } = req.body;
    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    grievance.status = 'reopened';
    grievance.timeline.push({
      status: 'reopened',
      note: note || 'Manually reopened for further investigation',
      timestamp: new Date(),
      updatedBy: req.userId
    });

    // --- AUDIT: Reopened ---
    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "GRIEVANCE_REOPENED",
      performedBy: actor,
      newValue: { status: 'reopened' },
      reason: note || "Manually reopened by authorized user for further investigation"
    }));

    appendCaseHistory(grievance, createCaseHistoryEntry({
      status: 'reopened',
      note: note || 'Your complaint has been reopened for further investigation.',
      actor: { name: req.user.name, role: req.user.role },
      visibility: 'citizen'
    }));

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
