import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, AlertCircle, AlertTriangle, ShieldAlert, Navigation, Trash2, Edit2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { grievanceAPI, aiAPI } from '../services/api';
import VoiceComplaintInput from '../components/citizen/VoiceComplaintInput';
import GrievanceCopilot from '../components/citizen/GrievanceCopilot';
import LiveGeoTaggedCapture from '../components/citizen/LiveGeoTaggedCapture';
import { qrZones } from '../data/qrZones';
import { detectGPSLocation, reverseGeocode, formatAccuracy, getQRContext, setQRContext, clearQRContext } from '../utils/locationHelper';
import { watermarkImage } from '../utils/watermarkEvidenceImage';
import { cleanDisplayAddress } from '../utils/cleanAddress';
import {
  buildNeedsReviewClassification,
  categoryFromDepartment,
  isLowConfidenceClassification,
  isMeaningfulComplaintText,
  normalizeConfidencePercent
} from '../utils/complaintQuality';

const categories = [
  { value: 'Public Infrastructure', icon: 'construction', color: '#283593', bg: '#e8eaf6' },
  { value: 'Sanitation & Waste', icon: 'delete', color: '#2e7d32', bg: '#e8f5e9' },
  { value: 'Water Supply', icon: 'water_drop', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'Electricity', icon: 'bolt', color: '#e65100', bg: '#fff3e0' },
  { value: 'Public Safety', icon: 'shield', color: '#6a1b9a', bg: '#f3e5f5' },
];

const getAccuracyStatus = (accuracy) => {
  const meters = Number(accuracy);
  if (!Number.isFinite(meters)) return { label: 'Not reported', tone: 'var(--on-surface-variant)' };
  if (meters <= 50) return { label: 'Good', tone: '#2e7d32' };
  if (meters <= 250) return { label: 'Moderate', tone: 'var(--warning)' };
  return { label: 'Low', tone: 'var(--error)' };
};

const TRUSTED_LOCALITY_ACCURACY_METERS = 100;

const formatCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate.toFixed(6) : 'Not available';
};

const buildConfirmedDisplayAddress = (fields, fallbackAddress = '') => {
  const manualArea = fields.area?.trim();
  const manualAddress = manualArea
    ? [manualArea, fields.city?.trim(), fields.state?.trim()].filter(Boolean).join(', ')
    : '';
  return cleanDisplayAddress(manualAddress || fields.address || fields.displayAddress || fallbackAddress);
};

const buildLocationPreview = (fields) => {
  const landmark = fields.landmark?.trim();
  const address = buildConfirmedDisplayAddress(fields);
  const pincode = fields.pincode?.trim();

  const base = (landmark && address) ? `${landmark}, ${address}` : (landmark || address || '');
  if (!base) return '';
  // Append manual pincode if not already present in base string
  if (pincode && !base.includes(pincode)) return `${base} - ${pincode}`;
  return base;
};

const buildCoarseDisplayAddress = (geocoded, fallbackAddress) => {
  const city = geocoded?.city || geocoded?.fullData?.city || geocoded?.fullData?.town || geocoded?.fullData?.village || geocoded?.fullData?.state_district || '';
  const state = geocoded?.state || geocoded?.fullData?.state || '';
  const country = geocoded?.fullData?.country || '';
  return cleanDisplayAddress([city, state, country].filter(Boolean).join(', ')) || cleanDisplayAddress(fallbackAddress);
};

const buildLocationPayload = (fields, detected, sourceOverride) => {
  const lat = detected?.lat ?? detected?.coordinates?.lat ?? null;
  const lng = detected?.lng ?? detected?.coordinates?.lng ?? null;

  const suggestedAddress = detected?.suggestedAddress || detected?.rawAddress || '';
  const displayAddress = buildConfirmedDisplayAddress(fields, detected?.displayAddress || detected?.address || suggestedAddress);
  const manualPincode = fields.pincode?.trim() || '';
  const finalAddress = buildLocationPreview({
    ...fields,
    address: displayAddress,
    pincode: manualPincode,
  }) || displayAddress || suggestedAddress;

  const payload = {
    lat,
    lng,
    accuracy: detected?.accuracy ?? null,
    address: finalAddress || displayAddress || fields.address?.trim() || detected?.address || '',
    landmark: fields.landmark?.trim() || '',
    city: fields.city?.trim() || detected?.city || '',
    state: fields.state?.trim() || detected?.state || '',
    pincode: manualPincode,
    source: sourceOverride || detected?.source || 'Manual',
    suggestedAddress,
    displayAddress,
    finalAddress,
    confirmedByUser: true,
    detectedAt: detected?.timestamp ? new Date(detected.timestamp).toISOString() : new Date().toISOString(),
  };

  if (fields.area?.trim() || detected?.area) payload.area = fields.area?.trim() || detected?.area;
  if (fields.ward?.trim() || detected?.ward) payload.ward = fields.ward?.trim() || detected?.ward;
  if (fields.zone?.trim() || detected?.zone) payload.zone = fields.zone?.trim() || detected?.zone;
  if (lat !== null && lng !== null) payload.coordinates = { lat, lng };

  return payload;
};

export default function NewGrievance() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const zoneIdParam = searchParams.get('zoneId');
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [aiClassification, setAiClassification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [liveEvidence, setLiveEvidence] = useState(null);
  
  // Location management
  const [isLocating, setIsLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(null);
  const [qrContext, setQrContextState] = useState(null);
  const [showLocationEdit, setShowLocationEdit] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationWarning, setLocationWarning] = useState(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  
  // Manual location fields
  const [locationFields, setLocationFields] = useState({
    landmark: '',
    city: '',
    area: '',
    ward: '',
    zone: '',
    address: '',
    state: '',
    pincode: '',
  });
  const locationFieldsRef = useRef(locationFields);

  const [form, setForm] = useState({
    citizenName: user?.name || '',
    citizenEmail: user?.email || '',
    citizenPhone: user?.phone || '',
    title: '',
    description: '',
    category: '',
    location: '',
    dateOfIncident: '',
    privacyConsent: false,
    locationSource: '', // GPS | QR | Manual
  });

  const [voiceLanguage, setVoiceLanguage] = useState('hi-IN');

  useEffect(() => {
    locationFieldsRef.current = locationFields;
  }, [locationFields]);

  const updateLocationFields = (updates) => {
    const next = { ...locationFieldsRef.current, ...updates };
    locationFieldsRef.current = next;
    setLocationFields(next);

    const preview = buildLocationPreview(next);
    if (preview) {
      setForm(formPrev => ({
        ...formPrev,
        location: preview,
        locationSource: formPrev.locationSource || locationDetected?.source || 'Manual',
      }));
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'landmark')) {
      setLocationConfirmed(false);
      if (updates.landmark?.trim()) setLocationWarning(null);
    }
  };

  useEffect(() => {
    const storedDraft = localStorage.getItem('civictrust_draft_complaint');
    if (!storedDraft) return;

    setForm(prev => {
      if (prev.description?.trim()) return prev;
      localStorage.removeItem('civictrust_draft_complaint');
      return { ...prev, description: storedDraft };
    });
  }, []);

  // Initialize QR context if coming from QR route
  useEffect(() => {
    if (zoneIdParam) {
      const zone = qrZones.find(z => z.zoneId === zoneIdParam);
      if (zone) {
        setQRContext(zone);
        const qrCtx = getQRContext();
        setQrContextState(qrCtx);
        
        // Prefill location from QR zone
        if (qrCtx) {
          const rawQrAddress = qrCtx.address || '';
          const displayQrAddress = cleanDisplayAddress(rawQrAddress) || rawQrAddress;
          setLocationDetected({
            lat: qrCtx.lat,
            lng: qrCtx.lng,
            address: displayQrAddress,
            suggestedAddress: rawQrAddress,
            displayAddress: displayQrAddress,
            mapDisplayAddress: displayQrAddress,
            source: 'QR',
            city: displayQrAddress?.split(',')[0] || '',
            ward: qrCtx.ward || '',
            zone: qrCtx.zone || '',
            timestamp: Date.now(),
          });
          
          const nextFields = {
            ...locationFieldsRef.current,
            city: displayQrAddress?.split(',')[0] || '',
            area: '',
            ward: qrCtx.ward || '',
            zone: qrCtx.zone || '',
            address: displayQrAddress,
            state: '',
            pincode: '',
          };

          locationFieldsRef.current = nextFields;
          setLocationFields(nextFields);
          
          setForm(prev => ({
            ...prev,
            location: buildLocationPreview(nextFields) || displayQrAddress,
            locationSource: 'QR',
          }));
          setLocationConfirmed(false);
        }
      }
    } else {
      // Not coming from QR, don't use stale QR context
      const qr = getQRContext();
      if (qr) {
        // Show that we found old QR context but user is filing normal complaint
        setQrContextState(qr);
      }
    }
  }, [zoneIdParam]);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setLocationWarning(null);
    
    try {
      const gpsLocation = await detectGPSLocation();
      
      // Try reverse geocoding
      const geocoded = await reverseGeocode(gpsLocation.lat, gpsLocation.lng);
      const detectedAddress = geocoded?.address || `${gpsLocation.lat}, ${gpsLocation.lng}`;
      const isApproximateGps = Number(gpsLocation.accuracy) > TRUSTED_LOCALITY_ACCURACY_METERS;
      const cleanedDetectedAddress = cleanDisplayAddress(detectedAddress) || detectedAddress;
      const displayAddress = isApproximateGps
        ? buildCoarseDisplayAddress(geocoded, cleanedDetectedAddress)
        : cleanedDetectedAddress;
      const detectedCity = cleanDisplayAddress(geocoded?.city || '');
      const detectedState = cleanDisplayAddress(geocoded?.state || '');
      
      const locationData = {
        lat: gpsLocation.lat,
        lng: gpsLocation.lng,
        accuracy: gpsLocation.accuracy,
        source: 'GPS',
        timestamp: Date.now(),
        address: displayAddress,
        suggestedAddress: detectedAddress,
        displayAddress,
        mapDisplayAddress: displayAddress,
        city: detectedCity,
        area: isApproximateGps ? '' : (geocoded?.area || ''),
        state: detectedState,
        pincode: '',
        isApproximateGps,
      };
      
      setLocationDetected(locationData);
      const nextFields = {
        ...locationFieldsRef.current,
        city: detectedCity,
        area: isApproximateGps ? '' : (geocoded?.area || ''),
        ward: '',
        zone: '',
        address: displayAddress,
        state: detectedState,
        pincode: '',
      };

      locationFieldsRef.current = nextFields;
      setLocationFields(nextFields);
      
      setForm(prev => ({
        ...prev,
        location: buildLocationPreview(nextFields) || displayAddress,
        locationSource: 'GPS',
      }));
      setLocationConfirmed(false);
      if (isApproximateGps) {
        setLocationWarning('GPS accuracy is approximate. Please enter your actual area/locality and exact landmark.');
      }
      
    } catch (error) {
      console.error('Location detection error:', error);
      
      if (error.code === 1) {
        setLocationError('Location permission denied. Please enter your address manually or check permissions.');
      } else if (error.code === 3) {
        setLocationError('Location detection timed out. Please try again or enter manually.');
      } else {
        setLocationError('Could not detect your location. Please enter your address manually.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleUseDetectedLocation = () => {
    if (locationDetected) {
      const fields = locationFieldsRef.current;
      const hasLandmark = Boolean(fields.landmark?.trim());
      const hasArea = Boolean(fields.area?.trim());
      const hasPincode = Boolean(fields.pincode?.trim());
      const needsAreaConfirmation = locationDetected.isApproximateGps || Number(locationDetected.accuracy) > TRUSTED_LOCALITY_ACCURACY_METERS;

      const warnings = [];
      if (needsAreaConfirmation && !hasArea) warnings.push('Please enter your actual area/locality.');
      if (!hasLandmark) warnings.push('Please add an exact landmark for faster routing.');
      if (!hasPincode) warnings.push('Please confirm pincode if available.');

      if (warnings.length > 0) {
        setLocationWarning(warnings.join(' '));
        if ((needsAreaConfirmation && !hasArea) || !hasLandmark) setShowLocationEdit(true);
      } else {
        setLocationWarning(null);
        setShowLocationEdit(false);
      }

      setForm(prev => ({
        ...prev,
        location: buildLocationPreview(fields) || locationDetected.address,
        locationSource: locationDetected.source,
      }));
      // Always confirm after user explicitly clicks Use This Location
      setLocationConfirmed(true);
    }
  };

  const handleEditLocation = () => {
    setShowLocationEdit(true);
  };

  const handleSaveManualLocation = () => {
    const fields = locationFieldsRef.current;
    const savedSource = locationDetected?.source || 'Manual';
    const manualAddress = [
      fields.area,
      fields.city,
      fields.ward ? `${fields.ward}` : '',
      fields.zone ? `${fields.zone} Zone` : '',
    ]
      .filter(Boolean)
      .join(', ') || fields.address;
    const displayAddress = cleanDisplayAddress(fields.address?.trim() || manualAddress) || fields.address?.trim() || manualAddress;
    const nextFields = {
      ...fields,
      address: displayAddress,
    };

    locationFieldsRef.current = nextFields;
    setLocationFields(nextFields);
    
    setForm(prev => ({
      ...prev,
      location: buildLocationPreview(nextFields) || manualAddress,
      locationSource: savedSource,
    }));
    
    setLocationDetected(prev => ({
      ...prev,
      source: savedSource,
      address: displayAddress,
      displayAddress,
      landmark: nextFields.landmark,
      city: nextFields.city,
      area: nextFields.area,
      ward: nextFields.ward,
      zone: nextFields.zone,
      state: nextFields.state,
      pincode: nextFields.pincode,
    }));
    
    setLocationWarning(null);
    setLocationConfirmed(Boolean(nextFields.landmark?.trim()));
    setShowLocationEdit(false);
  };

  const handleClearQRLocation = () => {
    clearQRContext();
    setQrContextState(null);
  };

  const handleRedetectLocation = async () => {
    setLocationDetected(null);
    setLocationError(null);
    setLocationWarning(null);
    setLocationConfirmed(false);
    await handleDetectLocation();
  };

  const buildLiveEvidenceGeoTag = (finalLocation) => {
    if (!liveEvidence?.file) return null;

    return {
      lat: liveEvidence.geoTag?.lat ?? null,
      lng: liveEvidence.geoTag?.lng ?? null,
      accuracy: liveEvidence.geoTag?.accuracy ?? null,
      capturedAt: liveEvidence.geoTag?.capturedAt || new Date().toISOString(),
      source: liveEvidence.geoTag?.source || 'GPS',
      landmark: liveEvidence.landmark || liveEvidence.geoTag?.landmark || finalLocation?.landmark || '',
      address: liveEvidence.geoTag?.address || finalLocation?.address || form.location || ''
    };
  };

  const appendPayloadToFormData = (formData, payload) => {
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
  };

  const getCombinedComplaintText = () => `${form.title || ''} ${form.description || ''}`.trim();

  const handleSubmit = async () => {
    const needsManualReview = isLowConfidenceClassification(aiClassification)
      || !isMeaningfulComplaintText(getCombinedComplaintText());

    if (needsManualReview && !window.confirm('Your complaint needs more details. It may be sent to manual review.')) {
      return;
    }

    const hasLiveEvidence = Boolean(liveEvidence?.file);
    if (!hasLiveEvidence) {
      const warning = aiClassification?.priority === 'critical' || aiClassification?.priority === 'high'
        ? 'Critical complaints should include live geo-tagged evidence when possible. Continue without it?'
        : 'Live geo-tagged evidence improves verification. Continue without it?';

      if (!window.confirm(warning)) return;
    }

    setLoading(true);
    try {
      const fieldsForSubmit = {
        ...locationFieldsRef.current,
        address: locationFieldsRef.current.address?.trim() || form.location,
      };
      const finalLocation = buildLocationPayload(
        fieldsForSubmit,
        locationDetected,
        form.locationSource || locationDetected?.source || 'Manual'
      );

      const aiSuggestedCategory = aiClassification
        ? aiClassification.category || categoryFromDepartment(aiClassification.suggestedDepartment)
        : undefined;

      const payload = {
        ...form,
        location: finalLocation,
        category: form.category || aiSuggestedCategory,
        privacyConsentAt: new Date().toISOString(),
        locationSource: finalLocation.source, // Include source (GPS | QR | Manual)
        locationDetected: finalLocation,
        locationConfirmed,
      };

      let res;

      if (hasLiveEvidence) {
        const formData = new FormData();
        appendPayloadToFormData(formData, payload);

        const liveGeoTag = buildLiveEvidenceGeoTag(finalLocation);
        let liveFile = liveEvidence.file;

        try {
          liveFile = await watermarkImage(liveEvidence.file, liveGeoTag, liveGeoTag?.landmark || '');
        } catch (error) {
          console.warn('Evidence watermarking skipped:', error);
        }

        formData.append('liveEvidence', liveFile, liveFile.name || liveEvidence.file.name || 'live-evidence.jpg');
        formData.append('liveEvidenceGeoTag', JSON.stringify(liveGeoTag));
        res = await grievanceAPI.create(formData);
      } else {
        res = await grievanceAPI.create(payload);
      }
      
      // Clear QR context after successful submission
      clearQRContext();
      
      setSuccess(res.data.grievance);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced AI classification and Duplicate Check
  useEffect(() => {
    if (step !== 2) return;

    const combinedComplaintText = `${form.title || ''} ${form.description || ''}`.trim();
    if (!combinedComplaintText) {
      setAiClassification(null);
      setDuplicateInfo(null);
      setAiLoading(false);
      setDuplicateLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (!isMeaningfulComplaintText(combinedComplaintText)) {
        setAiClassification(buildNeedsReviewClassification());
        setDuplicateInfo(null);
        setAiLoading(false);
        setDuplicateLoading(false);
        return;
      }

      if (combinedComplaintText.length >= 15) {
        setAiLoading(true);
        setDuplicateLoading(true);
        try {
          // Parallel AI classification and Duplicate check
          const [classRes, dupRes] = await Promise.all([
            aiAPI.classify({
              title: form.title,
              description: form.description
            }),
            aiAPI.checkDuplicate({ title: form.title, description: form.description })
          ]);

          setAiClassification(classRes.data);
          setDuplicateInfo(dupRes.data);
        } catch (err) {
          console.error('AI Processing error:', err);
        } finally {
          setAiLoading(false);
          setDuplicateLoading(false);
        }
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form.title, form.description, step]);

  const canProceed = () => {
    if (step === 1) return form.citizenName && form.citizenEmail;
    if (step === 2) return form.title && form.description;
    return true;
  };

  const finalLocationPreview = buildLocationPreview(locationFields);
  const suggestedMapAddress = cleanDisplayAddress(
    locationDetected?.mapDisplayAddress || locationDetected?.suggestedAddress || locationDetected?.address || ''
  );
  const accuracyStatus = getAccuracyStatus(locationDetected?.accuracy);
  const gpsAccuracy = Number(locationDetected?.accuracy);
  const mapLocalityIsApproximate = Boolean(locationDetected?.isApproximateGps || (locationDetected?.source === 'GPS' && gpsAccuracy > TRUSTED_LOCALITY_ACCURACY_METERS));
  // Two-level accuracy warnings
  const showAccuracyWarning = locationDetected?.source === 'GPS' && gpsAccuracy > 50 && gpsAccuracy <= 100;
  const showStrongAccuracyWarning = locationDetected?.source === 'GPS' && gpsAccuracy > 100;
  const aiNeedsReview = isLowConfidenceClassification(aiClassification);
  const aiConfidencePercent = normalizeConfidencePercent(aiClassification?.confidence ?? aiClassification?.classification?.confidence);
  const aiSuggestedRoute = aiNeedsReview
    ? 'Needs Review'
    : aiClassification?.suggestedDepartment || aiClassification?.classification?.suggestedDepartment || 'Analyzing...';
  const aiStatusText = aiLoading
    ? 'Analyzing description...'
    : aiNeedsReview
    ? 'Waiting for clear complaint details'
    : aiClassification
    ? 'Classification ready'
    : 'Waiting for input...';
  const aiMatchLabel = aiNeedsReview ? 'Low Confidence' : `${aiConfidencePercent}% Match`;
  const aiLanguageLabel = aiNeedsReview ? 'Not enough text' : (aiClassification?.detectedLanguage || 'Detecting...');

  // Success screen
  if (success) {
    return (
      <div className="page-shell app-warm-bg">
      <div className="container page-content" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div style={{
            width: '5rem', height: '5rem', borderRadius: '50%',
            background: 'var(--secondary-container)', color: 'var(--on-secondary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: '2.5rem' }}>check_circle</span>
          </div>
        </motion.div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('deep.grievanceSubmit')}</h1>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem', fontSize: '1.125rem' }}>{t('deep.yourComplaintHa')}</p>
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600 }}>{t('deep.trackingID')}</span>
            <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.125rem' }}>{success.trackingId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{t('deep.category')}</span>
            <span style={{ fontWeight: 600 }}>{success.category}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{t('deep.department')}</span>
            <span style={{ fontWeight: 600 }}>{success.department}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{t('deep.priority')}</span>
            <span className={`badge badge-${success.priority}`}>{success.priority}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary civic-gradient-button">{t('deep.goToDashboard')}</button>
          <button onClick={() => { setSuccess(null); setStep(1); setLiveEvidence(null); setForm({ ...form, title: '', description: '', category: '', location: '', dateOfIncident: '' }); }} className="btn btn-outline warm-outline-button">{t('deep.fileAnother')}</button>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="page-shell app-warm-bg">
    <div className="container page-content" style={{ maxWidth: '1200px' }}>
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="warm-accent-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div className="badge badge-ai" style={{ marginBottom: '0.85rem' }}>{t('grievance.guidedIntake')}</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{t('deep.newGrievance')}</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)' }}>{t('deep.pleaseProvideTh')}</p>
      </motion.div>

      {/* Step Progress */}
      <div style={{ marginBottom: '3rem', position: 'relative', padding: '0 2rem' }}>
        <div className="step-progress">
          <div className="step-progress-bar" />
          <div className="step-progress-fill" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />
          {['Contact', 'Details', 'Review'].map((label, i) => (
            <div key={i} className="step-item">
              <div className={`step-circle ${i + 1 < step ? 'completed' : i + 1 === step ? 'active' : 'pending'}`}>
                {i + 1 < step ? (
                  <span className="material-symbols-outlined filled" style={{ fontSize: '0.875rem' }}>check</span>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`step-label ${i + 1 === step ? 'active' : ''}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>{t('deep.contactInformat')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenName">{t('deep.fullName')}</label>
                    <input id="citizenName" className="form-input" type="text" value={form.citizenName} onChange={e => setForm({ ...form, citizenName: e.target.value })} placeholder={t('deep.yourFullName')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenEmail">{t('deep.emailAddress')}</label>
                    <input id="citizenEmail" className="form-input" type="email" value={form.citizenEmail} onChange={e => setForm({ ...form, citizenEmail: e.target.value })} placeholder={t('deep.youExampleCom')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenPhone">{t('deep.phoneNumber')}</label>
                    <input id="citizenPhone" className="form-input" type="tel" value={form.citizenPhone} onChange={e => setForm({ ...form, citizenPhone: e.target.value })} placeholder="9876543210" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>{t('deep.incidentDetails')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="title">Grievance Title</label>
                    <input id="title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('deep.brieflyDescribe')} required />
                  </div>
                  <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(14,165,164,0.05))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,164,0.15)', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                      <Mic size={18} />
                      <span style={{ fontSize: '0.875rem' }}>{t('deep.voiceFirstGriev')}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{t('deep.citizensCanSpea')}</p>
                  </div>

                  <VoiceComplaintInput
                    value={form.description}
                    onChange={(val) => setForm({ ...form, description: val })}
                    language={voiceLanguage}
                    onLanguageChange={setVoiceLanguage}
                  />
                  <GrievanceCopilot roughText={form.description} onApply={(val) => setForm({ ...form, description: val })} />

                  <div>

                    {/* Duplicate Warning */}
                    <AnimatePresence>
                      {duplicateInfo?.isDuplicate && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'var(--error-container)',
                            color: 'var(--on-error-container)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '4px solid var(--error)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <AlertCircle size={18} />
                            <p style={{ fontWeight: 700 }}>Potential Duplicate Detected ({duplicateInfo.similarity}%)</p>
                          </div>
                          <p style={{ marginBottom: '0.75rem', opacity: 0.9 }}>
                            A similar grievance has already been filed: <strong>"{duplicateInfo.existingGrievance.title}"</strong>.
                            You may want to track the existing issue instead.
                          </p>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                              onClick={() => navigate(`/track?id=${duplicateInfo.existingGrievance.trackingId}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--on-error-container)', border: '1px solid rgba(0,0,0,0.1)' }}
                            >
                              Track Existing Issue
                            </button>
                            <button
                              onClick={() => setDuplicateInfo(null)}
                              className="btn btn-ghost btn-sm"
                              style={{ opacity: 0.7 }}
                            >
                              File Anyway
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="dateOfIncident">{t('deep.dateOfIncident')}</label>
                      <input id="dateOfIncident" className="form-input" type="date" value={form.dateOfIncident} onChange={e => setForm({ ...form, dateOfIncident: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('deep.location')}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="location"
                          className="form-input"
                          type="text"
                          value={form.location}
                          onChange={e => {
                            const address = e.target.value;
                            setForm({ ...form, location: address, locationSource: form.locationSource || 'Manual' });
                            setLocationFields(prev => {
                              const next = { ...prev, address };
                              locationFieldsRef.current = next;
                              return next;
                            });
                            setLocationConfirmed(false);
                          }}
                          placeholder={t('deep.addressOrLandma')}
                        />
                        <button
                          onClick={handleDetectLocation}
                          disabled={isLocating}
                          className="btn-icon"
                          style={{ position: 'absolute', top: '50%', right: '0.5rem', transform: 'translateY(-50%)', width: '2rem', height: '2rem' }}
                          title="Detect your location with GPS"
                        >
                          {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!locationDetected && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="exactLandmark">{t('grievance.exactLandmark')}</label>
                      <input
                        id="exactLandmark"
                        className="form-input"
                        type="text"
                        value={locationFields.landmark}
                        onChange={e => updateLocationFields({ landmark: e.target.value })}
                        placeholder="Example: Bansal College, Main Gate, Near Canteen"
                      />
                    </div>
                  )}

                  {/* Location Detection Card */}
                  <AnimatePresence>
                    {locationDetected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          padding: '1rem',
                          background: 'linear-gradient(135deg, rgba(14,165,164,0.08), rgba(30,58,138,0.08))',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(14,165,164,0.2)',
                          marginBottom: '1rem',
                        }}
                      >
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', display: 'none' }}>
                          {locationDetected.source === 'QR' ? '📍 Location from QR Zone' : '🛰️ Detected Location'}
                        </h4>
                        
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase' }}>
                          {locationDetected.source === 'QR' ? 'Location from QR Zone' : 'Detected Location'}
                        </h4>

                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.75rem' }}>{t('deep.gPSCoordinates')}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <div style={{ padding: '0.625rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,164,0.15)' }}>
                              <p style={{ color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '0.25rem' }}>{t('deep.latitude')}</p>
                              <p style={{ fontFamily: 'monospace', color: 'var(--on-surface)' }}>{formatCoordinate(locationDetected.lat)}</p>
                            </div>
                            <div style={{ padding: '0.625rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,164,0.15)' }}>
                              <p style={{ color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '0.25rem' }}>{t('deep.longitude')}</p>
                              <p style={{ fontFamily: 'monospace', color: 'var(--on-surface)' }}>{formatCoordinate(locationDetected.lng)}</p>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.75rem' }}>{t('deep.accuracy')}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                            {locationDetected.accuracy ? `${locationDetected.accuracy}m` : 'Not reported'}
                            <span style={{ color: accuracyStatus.tone, fontWeight: 700, marginLeft: '0.5rem' }}>{accuracyStatus.label}</span>
                          </p>
                        </div>

                        {/* Part D: Two-level accuracy warnings */}
                        {showAccuracyWarning && (
                          <div style={{
                            padding: '0.75rem',
                            background: 'rgba(239,153,0,0.08)',
                            border: '1px solid rgba(239,153,0,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'flex-start',
                          }}>
                            <AlertCircle size={14} color="#ef9900" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#9a5f00' }}>{t('deep.gPSIsApproximat')}</span>
                          </div>
                        )}
                        {showStrongAccuracyWarning && (
                          <div style={{
                            padding: '0.75rem',
                            background: 'rgba(239,100,0,0.1)',
                            border: '1px solid rgba(239,100,0,0.3)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'flex-start',
                          }}>
                            <AlertTriangle size={14} color="#e65100" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#b34000', fontWeight: 600 }}>{t('deep.locationAccurac')}</span>
                          </div>
                        )}

                        {/* Suggested map address */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.75rem' }}>{t('deep.suggestedAddres')}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.5, marginBottom: '0.25rem' }}>{suggestedMapAddress || 'Address not available'}</p>
                          <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', lineHeight: 1.4 }}>
                            {mapLocalityIsApproximate
                              ? 'GPS accuracy is approximate, so nearby locality names from the map may be wrong. Enter your actual area/locality and landmark below.'
                              : t('deep.administrativeA')}
                          </p>
                        </div>

                        {/* Part B: Landmark field in location card */}
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" htmlFor="detectedArea">Area / Locality</label>
                          <input
                            id="detectedArea"
                            className="form-input"
                            type="text"
                            value={locationFields.area}
                            onChange={e => updateLocationFields({ area: e.target.value })}
                            placeholder="Example: Anand Nagar"
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" htmlFor="detectedLandmark">{t('grievance.exactLandmark')}</label>
                          <input
                            id="detectedLandmark"
                            className="form-input"
                            type="text"
                            value={locationFields.landmark}
                            onChange={e => updateLocationFields({ landmark: e.target.value })}
                            placeholder="Example: Bansal College Main Gate, Anand Nagar"
                          />
                        </div>

                        {/* Part B: Quick pincode confirmation in location card */}
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" htmlFor="quickPincode">{t('grievance.confirmPincode')}</label>
                          <input
                            id="quickPincode"
                            className="form-input"
                            type="text"
                            inputMode="numeric"
                            value={locationFields.pincode}
                            onChange={e => updateLocationFields({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                            placeholder="Example: 462022"
                            maxLength={6}
                          />
                          {locationFields.pincode && !/^\d{6}$/.test(locationFields.pincode) && (
                            <p style={{ fontSize: '0.6875rem', color: '#e65100', marginTop: '0.25rem' }}>{t('deep.EnterAValid6Dig')}</p>
                          )}
                        </div>

                        {locationWarning && (
                          <div style={{
                            padding: '0.75rem',
                            background: 'rgba(239,153,0,0.1)',
                            border: '1px solid rgba(239,153,0,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'flex-start',
                          }}>
                            <AlertCircle size={14} color="#ef9900" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#9a5f00' }}>{locationWarning}</span>
                          </div>
                        )}

                        {/* Part C: Final Location Preview with GPS coords */}
                        <div style={{ padding: '0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,164,0.2)' }}>
                          <p style={{ color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('grievance.finalPreview')}</p>
                          {finalLocationPreview ? (
                            <>
                              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.5, marginBottom: '0.5rem', fontWeight: 600 }}>{finalLocationPreview}</p>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace', lineHeight: 1.6, paddingTop: '0.375rem', borderTop: '1px dashed var(--outline-variant)' }}>
                                <span>Lat: {formatCoordinate(locationDetected.lat)}</span>
                                <span style={{ margin: '0 0.5rem' }}>|</span>
                                <span>Lng: {formatCoordinate(locationDetected.lng)}</span>
                                {locationDetected.accuracy && (
                                  <span> | Accuracy: {Math.round(gpsAccuracy)}m</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>{t('deep.addLandmarkAndC')}</p>
                          )}
                        </div>

                        <div style={{ display: 'none' }}>
                        {locationDetected.accuracy && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                            {formatAccuracy(locationDetected.accuracy)}
                          </p>
                        )}
                        
                        {locationDetected.accuracy && locationDetected.accuracy > 1000 && (
                          <div style={{
                            padding: '0.75rem',
                            background: 'rgba(239,153,0,0.1)',
                            border: '1px solid rgba(239,153,0,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'flex-start',
                          }}>
                            <AlertCircle size={14} color="#ef9900" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#ef9900' }}>{t('deep.locationAccuracx')}</span>
                          </div>
                        )}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
                          <div>
                            <p style={{ color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '0.25rem' }}>{t('deep.latitude')}</p>
                            <p style={{ fontFamily: 'monospace', color: 'var(--on-surface)' }}>{locationDetected.lat}</p>
                          </div>
                          <div>
                            <p style={{ color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '0.25rem' }}>{t('deep.longitude')}</p>
                            <p style={{ fontFamily: 'monospace', color: 'var(--on-surface)' }}>{locationDetected.lng}</p>
                          </div>
                        </div>
                        
                        {locationDetected.address && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <p style={{ color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.75rem' }}>{t('deep.address')}</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>{locationDetected.address}</p>
                          </div>
                        )}
                        
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={handleUseDetectedLocation}
                            className="btn btn-sm btn-primary"
                            style={{ flex: '1 1 auto', minWidth: '120px' }}
                          >
                            <Check size={14} style={{ marginRight: '0.25rem' }} />{t('grievance.useThisLocation')}</button>
                          <button
                            onClick={handleEditLocation}
                            className="btn btn-sm btn-outline"
                            style={{ flex: '1 1 auto', minWidth: '100px' }}
                          >
                            <Edit2 size={14} style={{ marginRight: '0.25rem' }} />{t('deep.edit')}</button>
                          {locationDetected.source === 'GPS' && (
                            <button
                              onClick={handleRedetectLocation}
                              className="btn btn-sm btn-outline"
                              style={{ flex: '1 1 auto', minWidth: '100px' }}
                            >
                              <Navigation size={14} style={{ marginRight: '0.25rem' }} />{t('deep.reDetect')}</button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Location Error */}
                  <AnimatePresence>
                    {locationError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          padding: '0.75rem',
                          background: 'var(--error-container)',
                          color: 'var(--on-error-container)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '1rem',
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'flex-start',
                          fontSize: '0.875rem',
                        }}
                      >
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                        <span>{locationError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Manual Location Edit */}
                  <AnimatePresence>
                    {showLocationEdit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          padding: '1rem',
                          background: 'var(--surface-container-low)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--surface-container-high)',
                          marginBottom: '1rem',
                        }}
                      >
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--on-surface)' }}>{t('deep.editLocationDet')}</h4>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" htmlFor="manualLandmark">{t('grievance.exactLandmark')}</label>
                          <input id="manualLandmark" className="form-input" type="text" value={locationFields.landmark} onChange={e => updateLocationFields({ landmark: e.target.value })} placeholder="Example: Bansal College, Main Gate, Near Canteen" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label" htmlFor="city">{t('deep.cityTown')}</label>
                            <input id="city" className="form-input" type="text" value={locationFields.city} onChange={e => updateLocationFields({ city: e.target.value })} placeholder="e.g. Bhopal" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="area">{t('deep.area')}</label>
                            <input id="area" className="form-input" type="text" value={locationFields.area} onChange={e => updateLocationFields({ area: e.target.value })} placeholder="e.g. Anand Nagar" />
                          </div>
                          {/* Part B: Ward, Zone, State, Pincode with correct placeholders */}
                          <div className="form-group">
                            <label className="form-label" htmlFor="ward">{t('deep.ward')}</label>
                            <input id="ward" className="form-input" type="text" value={locationFields.ward} onChange={e => updateLocationFields({ ward: e.target.value })} placeholder="Example: Ward 1" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="zone">{t('deep.zone')}</label>
                            <input id="zone" className="form-input" type="text" value={locationFields.zone} onChange={e => updateLocationFields({ zone: e.target.value })} placeholder="Example: North Zone" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="state">{t('deep.state')}</label>
                            <input id="state" className="form-input" type="text" value={locationFields.state} onChange={e => updateLocationFields({ state: e.target.value })} placeholder="e.g. Madhya Pradesh" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="pincode">{t('deep.pincode')}</label>
                            <input
                              id="pincode"
                              className="form-input"
                              type="text"
                              inputMode="numeric"
                              value={locationFields.pincode}
                              onChange={e => updateLocationFields({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                              placeholder="Example: 462022"
                              maxLength={6}
                            />
                            {locationFields.pincode && !/^\d{6}$/.test(locationFields.pincode) && (
                              <p style={{ fontSize: '0.6875rem', color: '#e65100', marginTop: '0.25rem' }}>{t('deep.EnterAValid6Dig')}</p>
                            )}
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="address">{t('deep.fullAddress')}</label>
                          <input id="address" className="form-input" type="text" value={locationFields.address} onChange={e => updateLocationFields({ address: e.target.value })} placeholder={t('deep.completeAddress')} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={handleSaveManualLocation}
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1 }}
                          >
                            <Check size={14} style={{ marginRight: '0.25rem' }} />{t('deep.saveChanges')}</button>
                          <button
                            onClick={() => setShowLocationEdit(false)}
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1 }}
                          >{t('deep.cancel')}</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* QR Context Banner */}
                  <AnimatePresence>
                    {qrContext && !zoneIdParam && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          padding: '0.75rem',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '1rem',
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <span style={{ flex: 1 }}>📍 Old QR Zone location found. Not using it for this complaint. <strong>{t('deep.zonex')}</strong> {qrContext.zoneName}</span>
                        <button
                          onClick={handleClearQRLocation}
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--primary)', padding: '0.25rem 0.5rem' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="form-group">
                    <label className="form-label">Category (Optional - AI will suggest)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      {categories.map(cat => (
                        <motion.button
                          key={cat.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setForm({ ...form, category: form.category === cat.value ? '' : cat.value })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                            border: `2px solid ${form.category === cat.value ? cat.color : 'var(--surface-container-high)'}`,
                            background: form.category === cat.value ? cat.bg : 'var(--surface-container-lowest)',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: cat.color }}>{cat.icon}</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: form.category === cat.value ? cat.color : 'var(--on-surface-variant)' }}>{cat.value}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>{t('grievance.liveEvidence')}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{t('deep.captureAFreshPh')}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--primary)', marginTop: '0.35rem', fontWeight: 700 }}>{t('deep.liveGeoTaggedCa')}</p>
                    </div>
                    <LiveGeoTaggedCapture onEvidenceChange={setLiveEvidence} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>{t('deep.reviewSubmit')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>{t('deep.contact')}</p>
                    <p style={{ fontWeight: 600 }}>{form.citizenName}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{form.citizenEmail} {form.citizenPhone && `• ${form.citizenPhone}`}</p>
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>Grievance Title</p>
                    <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{form.title}</p>
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>{t('deep.description')}</p>
                    <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{form.description}</p>
                  </div>
                  {form.location && (
                    <div>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>{t('deep.location')}</p>
                      <p>{form.location}</p>
                    </div>
                  )}
                  {liveEvidence?.file && (
                    <div style={{ padding: '1rem', background: 'rgba(14,165,164,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,164,0.18)' }}>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>{t('deep.liveGeoTaggedEv')}</p>
                      <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                        {liveEvidence.previewUrl && (
                          <img src={liveEvidence.previewUrl} alt="Live captured evidence" style={{ width: '6rem', height: '4.5rem', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,164,0.22)', flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{liveEvidence.file.name}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                            {Number.isFinite(Number(liveEvidence.geoTag?.lat)) && Number.isFinite(Number(liveEvidence.geoTag?.lng))
                              ? `GPS: ${Number(liveEvidence.geoTag.lat).toFixed(6)}, ${Number(liveEvidence.geoTag.lng).toFixed(6)}`
                              : 'Photo captured, but GPS permission was denied. Please allow location or enter location manually.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {aiClassification && (
                    <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(14,165,164,0.05))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,164,0.15)' }}>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>AI Classification</p>
                      <p style={{ fontWeight: 600 }}>
                        {aiClassification.suggestedDepartment}
                        <span className="badge badge-ai" style={{ marginLeft: '0.5rem' }}>
                          {aiClassification.confidence}% Match
                        </span>
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{t('deep.priorityx')}<span className={`badge badge-${aiClassification.priority}`}>{aiClassification.priority}</span>
                      </p>
                    </div>
                  )}

                  <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-container-high)', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      <ShieldAlert size={18} />
                      <span style={{ fontSize: '0.875rem' }}>{t('deep.privacyFirstGri')}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>{t('deep.civicTrustUsesY')}</p>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.privacyConsent}
                        onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                        style={{ marginTop: '0.25rem', width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.4 }}>{t('deep.iConsentToThePr')}</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-container)' }}>
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="btn btn-outline"
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.4 : 1 }}
            >{t('deep.back')}</button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn btn-secondary civic-gradient-button"
                disabled={!canProceed()}
              >
                Continue to {step === 1 ? 'Details' : 'Review'}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn btn-primary civic-gradient-button" disabled={loading || !form.privacyConsent}>
                {loading ? <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }} /> : (
                  <>{t('deep.submitGrievance')}<span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>send</span></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '80px' }}>
          {/* AI Classification Card */}
          <div className="glass-card premium-card-hover" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem' }}>
            <div style={{
              position: 'absolute', top: '-2rem', right: '-2rem', width: '6rem', height: '6rem',
              background: 'var(--ai-gradient)', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                background: 'var(--ai-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>smart_toy</span>
              </div>
              <div>
                <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Classification</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  {aiStatusText}
                </p>
              </div>
            </div>

            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="skeleton" style={{ height: '3.5rem' }} />
                <div className="skeleton" style={{ height: '2rem', width: '60%' }} />
              </div>
            ) : aiClassification ? (
              <div style={{ position: 'relative' }}>
                <div style={{
                  padding: '1rem', background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)', marginBottom: '1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('deep.suggestedRoute')}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.6875rem', fontWeight: 700,
                      color: aiNeedsReview ? '#7c3aed' : 'var(--secondary)',
                      background: aiNeedsReview ? 'rgba(124,58,237,0.1)' : 'var(--secondary-container)',
                      padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                    }}>
                      {aiNeedsReview && <AlertTriangle size={12} />}
                      {aiMatchLabel}
                    </span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {aiNeedsReview && <AlertTriangle size={16} color="#f59e0b" />}
                    {aiSuggestedRoute}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{t('deep.sentiment')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>{aiNeedsReview ? 'Needs Review' : (aiClassification.sentiment || 'Neutral')}</span>
                      {aiNeedsReview ? <AlertTriangle size={14} color="#f59e0b" /> : (aiClassification.isUrgent || aiClassification.priority === 'high') && <AlertCircle size={14} color="var(--error)" />}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{t('deep.language')}</p>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{aiLanguageLabel}</p>
                  </div>
                </div>

                {/* AI Evidence Verification */}
                {aiClassification.verification && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: aiClassification.verification.status === 'verified' ? 'rgba(14,165,164,0.05)' : 'rgba(239,153,0,0.05)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${aiClassification.verification.status === 'verified' ? 'rgba(14,165,164,0.2)' : 'rgba(239,153,0,0.2)'}`
                  }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{t('deep.evidenceVerific')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: aiClassification.verification?.status === 'verified' ? 'var(--ai-teal)' : 'var(--warning)' }}>
                        {aiClassification.verification?.status === 'verified' ? 'verified' : 'report_problem'}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{(aiClassification.verification?.status || 'Unknown').toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{aiClassification.verification?.reason}</p>
                  </div>
                )}

                {!aiNeedsReview && aiClassification.alternatives?.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{t('deep.otherPossibilit')}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {aiClassification.alternatives.map((alt, i) => (
                        <span key={i} style={{
                          padding: '0.25rem 0.75rem', background: 'var(--surface-container)',
                          borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 500, color: 'var(--on-surface-variant)',
                          border: '1px solid rgba(197,197,211,0.2)',
                        }}>{alt.department}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-container)' }}>
                  {aiNeedsReview
                    ? 'Add a clear issue, location, and impact to improve classification.'
                    : 'This classification helps speed up routing but will be reviewed by a human agent before final assignment.'}
                </p>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>psychology</span>
                <p style={{ fontSize: '0.8125rem' }}>{t('deep.startTypingYour')}</p>
              </div>
            )}
          </div>

          {/* Guidelines Card */}
          <div className="soft-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-container)' }}>info</span>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Submission Guidelines</h3>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Ensure location details are as accurate as possible.',
                'Photos significantly reduce investigation time.',
                'Do not include sensitive personal information (e.g., SSN, financial data) in the description.',
              ].map((tip, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)', flexShrink: 0, marginTop: '0.125rem' }}>check_circle</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
