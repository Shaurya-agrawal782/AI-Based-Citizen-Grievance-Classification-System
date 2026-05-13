const express = require('express');
const Grievance = require('../models/Grievance');
const { auth, requireRole } = require('../middleware/auth');
const { analyzeGrievance } = require('../utils/geminiAI');
const { createAuditEntry, createCaseHistoryEntry, appendAuditLog, appendCaseHistory } = require('../utils/auditLogger');

const router = express.Router();

const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);

const toNumberOrUndefined = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const number = toNumberOrUndefined(value);
    if (number !== undefined) return number;
  }
  return undefined;
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

// Create new grievance
router.post('/', auth, async (req, res) => {
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
      'Public Safety': 'Municipal Safety'
    };

    const finalDepartment = aiResult.suggestedDepartment;
    const finalCategory = category || Object.keys(categoryDeptMap).find(
      k => categoryDeptMap[k] === aiResult.suggestedDepartment
    ) || 'Public Infrastructure';

    // Parse location data (could be string or object). Keep legacy coordinates while
    // also storing top-level lat/lng for newer clients.
    let locationObject = {};
    if (typeof location === 'string') {
      locationObject.address = cleanString(location);
    } else if (location && typeof location === 'object') {
      locationObject = { ...location };
    }

    const detectedLocation = locationDetected && typeof locationDetected === 'object' ? locationDetected : null;
    if (detectedLocation) {
      locationObject.landmark = cleanString(detectedLocation.landmark) || locationObject.landmark;
      locationObject.address = cleanString(detectedLocation.address) || locationObject.address;
      locationObject.city = cleanString(detectedLocation.city) || locationObject.city;
      locationObject.state = cleanString(detectedLocation.state) || locationObject.state;
      locationObject.pincode = cleanString(detectedLocation.pincode) || locationObject.pincode;
      locationObject.area = cleanString(detectedLocation.area) || locationObject.area;
      locationObject.ward = cleanString(detectedLocation.ward) || locationObject.ward;
      locationObject.zone = cleanString(detectedLocation.zone) || locationObject.zone;
      locationObject.accuracy = toNumberOrUndefined(detectedLocation.accuracy) ?? locationObject.accuracy;
      locationObject.source = detectedLocation.source || locationSource || locationObject.source;
      locationObject.detectedAt = new Date();
    } else if (coordinates) {
      locationObject.coordinates = coordinates;
    } else if (typeof location === 'string' && location.includes(',')) {
      const [lat, lng] = location.split(',').map(s => parseFloat(s.trim()));
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
      privacyConsentAt: privacyConsentAt || null
    });

    // --- AUDIT: Grievance Created ---
    const citizenActor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "GRIEVANCE_CREATED",
      performedBy: citizenActor,
      newValue: { status: 'submitted', category: finalCategory, priority: aiResult.priority || 'medium', department: finalDepartment, locationSource: locationObject.source || 'Manual' },
      reason: "Citizen submitted grievance via CivicTrust portal"
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
      note: `AI has classified your complaint as "${finalCategory}" and routed it to "${finalDepartment}".`,
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
      .select('trackingId title category department priority status timeline caseHistory createdAt updatedAt');

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
    const { rating, comment } = req.body;
    const grievance = await Grievance.findById(req.params.id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (grievance.citizen.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the filing citizen can provide feedback' });
    }

    grievance.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    // --- AUDIT: Citizen Feedback ---
    const actor = { userId: req.userId, name: req.user.name, role: req.user.role };
    appendAuditLog(grievance, createAuditEntry({
      action: "CITIZEN_FEEDBACK_RECEIVED",
      performedBy: actor,
      newValue: { rating, comment: comment ? '[provided]' : '[none]' },
      reason: `Citizen provided feedback with rating ${rating}/5`
    }));

    if (rating >= 4) {
      grievance.status = 'closed';
      grievance.timeline.push({
        status: 'closed',
        note: 'Complaint closed after positive citizen feedback',
        timestamp: new Date()
      });
      appendAuditLog(grievance, createAuditEntry({
        action: "GRIEVANCE_CLOSED",
        performedBy: actor,
        newValue: { status: 'closed' },
        reason: "Complaint closed after positive citizen feedback (rating >= 4)"
      }));
      appendCaseHistory(grievance, createCaseHistoryEntry({
        status: 'closed',
        note: 'Thank you for your feedback! Your complaint has been closed successfully.',
        actor: { name: 'CivicTrust System', role: 'system' },
        visibility: 'citizen'
      }));
    } else if (rating <= 2) {
      grievance.status = 'reopened';
      grievance.timeline.push({
        status: 'reopened',
        note: 'Complaint reopened due to unsatisfactory resolution',
        timestamp: new Date()
      });
      appendAuditLog(grievance, createAuditEntry({
        action: "GRIEVANCE_REOPENED",
        performedBy: actor,
        newValue: { status: 'reopened' },
        reason: "Complaint reopened due to unsatisfactory resolution (rating <= 2)"
      }));
      appendCaseHistory(grievance, createCaseHistoryEntry({
        status: 'reopened',
        note: 'Your complaint has been reopened for further investigation based on your feedback.',
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
