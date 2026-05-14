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
import { detectGPSLocation, reverseGeocode, getQRContext, setQRContext, clearQRContext } from '../utils/locationHelper';
import { watermarkImage } from '../utils/watermarkEvidenceImage';
import { cleanDisplayAddress } from '../utils/cleanAddress';
import { buildEvidenceFingerprintBundle } from '../utils/evidenceAuthenticity';
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

const buildLocationPayload = (fields, detected, sourceOverride, options = {}) => {
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

  const detectedAt = detected?.detectedAt
    || (detected?.timestamp ? new Date(detected.timestamp).toISOString() : new Date().toISOString());
  const confirmedByUser = options.confirmedByUser ?? detected?.confirmedByUser ?? false;

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
    detectedAt,
    confirmedByUser,
  };

  if (fields.area?.trim() || detected?.area) payload.area = fields.area?.trim() || detected?.area;
  if (fields.ward?.trim() || detected?.ward) payload.ward = fields.ward?.trim() || detected?.ward;
  if (fields.zone?.trim() || detected?.zone) payload.zone = fields.zone?.trim() || detected?.zone;
  if (lat !== null && lng !== null) payload.coordinates = { lat, lng };
  if (detected?.mapDisplayAddress) payload.mapDisplayAddress = cleanDisplayAddress(detected.mapDisplayAddress);
  if (typeof detected?.isApproximateGps === 'boolean') payload.isApproximateGps = detected.isApproximateGps;
  if (detected?.timestamp) payload.timestamp = detected.timestamp;

  return payload;
};

const translateOr = (translate, key, fallback) => {
  const translated = translate(key);
  return translated && translated !== key ? translated : fallback;
};

export default function NewGrievance() {
  const { t } = useLanguage();
  const text = (key, fallback) => translateOr(t, key, fallback);
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
  const [confirmedLocation, setConfirmedLocation] = useState(null);
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
    const nextSource = form.locationSource || confirmedLocation?.source || 'Manual';
    if (preview) {
      setForm(formPrev => ({
        ...formPrev,
        location: preview,
        locationSource: formPrev.locationSource || confirmedLocation?.source || 'Manual',
      }));
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'landmark')) {
      setLocationConfirmed(false);
      if (updates.landmark?.trim()) setLocationWarning(null);
    }

    if (confirmedLocation) {
      setConfirmedLocation(prev => buildLocationPayload(
        next,
        prev || confirmedLocation,
        nextSource,
        { confirmedByUser: false }
      ));
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
          const qrLocationData = {
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
          };
          
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
          setConfirmedLocation(buildLocationPayload(nextFields, qrLocationData, 'QR', { confirmedByUser: false }));
          
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
      setConfirmedLocation(buildLocationPayload(nextFields, locationData, 'GPS', { confirmedByUser: false }));
      
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
    if (confirmedLocation) {
      const fields = locationFieldsRef.current;
      const hasLandmark = Boolean(fields.landmark?.trim());

      setLocationWarning(hasLandmark ? null : 'Landmark recommended for better routing.');

      setForm(prev => ({
        ...prev,
        location: buildLocationPreview(fields) || confirmedLocation.finalAddress || confirmedLocation.displayAddress || confirmedLocation.address,
        locationSource: confirmedLocation.source,
      }));
      setConfirmedLocation(prev => buildLocationPayload(fields, prev || confirmedLocation, confirmedLocation.source, { confirmedByUser: true }));
      // Always confirm after user explicitly clicks Use This Location
      setLocationConfirmed(true);
    }
  };

  const handleEditLocation = () => {
    setShowLocationEdit(prev => !prev);
  };

  const handleSaveManualLocation = () => {
    const fields = locationFieldsRef.current;
    const savedSource = confirmedLocation?.source || 'Manual';
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
    
    const confirmedByUser = Boolean(nextFields.landmark?.trim());
    setConfirmedLocation(prev => buildLocationPayload(
      nextFields,
      {
        ...(prev || confirmedLocation || {}),
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
      },
      savedSource,
      { confirmedByUser }
    ));
    
    setLocationWarning(null);
    setLocationConfirmed(confirmedByUser);
    setShowLocationEdit(false);
  };

  const handleClearQRLocation = () => {
    clearQRContext();
    setQrContextState(null);
  };

  const handleRedetectLocation = async () => {
    setConfirmedLocation(null);
    setLocationError(null);
    setLocationWarning(null);
    setLocationConfirmed(false);
    await handleDetectLocation();
  };

  const handleEvidenceLocationCaptured = (capturedLocation = {}) => {
    const source = capturedLocation.source || confirmedLocation?.source || 'GPS';
    const rawAddress = capturedLocation.finalAddress
      || capturedLocation.displayAddress
      || capturedLocation.address
      || capturedLocation.suggestedAddress
      || confirmedLocation?.finalAddress
      || confirmedLocation?.displayAddress
      || confirmedLocation?.address
      || '';
    const displayAddress = cleanDisplayAddress(rawAddress) || rawAddress;
    const nextFields = {
      ...locationFieldsRef.current,
      landmark: capturedLocation.landmark ?? locationFieldsRef.current.landmark,
      city: capturedLocation.city || locationFieldsRef.current.city || confirmedLocation?.city || '',
      area: capturedLocation.area || locationFieldsRef.current.area || confirmedLocation?.area || '',
      ward: capturedLocation.ward || locationFieldsRef.current.ward || confirmedLocation?.ward || '',
      zone: capturedLocation.zone || locationFieldsRef.current.zone || confirmedLocation?.zone || '',
      address: displayAddress || locationFieldsRef.current.address,
      state: capturedLocation.state || locationFieldsRef.current.state || confirmedLocation?.state || '',
      pincode: capturedLocation.pincode || locationFieldsRef.current.pincode || confirmedLocation?.pincode || '',
    };
    const nextDetected = {
      ...(confirmedLocation || {}),
      ...capturedLocation,
      source,
      address: displayAddress,
      displayAddress,
      suggestedAddress: capturedLocation.suggestedAddress || capturedLocation.address || confirmedLocation?.suggestedAddress || '',
      mapDisplayAddress: displayAddress,
      timestamp: capturedLocation.timestamp || Date.now(),
    };
    const confirmedByUser = Boolean(capturedLocation.confirmedByUser ?? confirmedLocation?.confirmedByUser ?? false);
    const nextConfirmedLocation = buildLocationPayload(nextFields, nextDetected, source, { confirmedByUser });

    locationFieldsRef.current = nextFields;
    setLocationFields(nextFields);
    setConfirmedLocation(nextConfirmedLocation);
    setForm(prev => ({
      ...prev,
      location: buildLocationPreview(nextFields) || nextConfirmedLocation.finalAddress || nextConfirmedLocation.displayAddress || displayAddress,
      locationSource: source,
    }));
    setLocationConfirmed(confirmedByUser);

    if (source === 'GPS' && Number(nextConfirmedLocation.accuracy) > TRUSTED_LOCALITY_ACCURACY_METERS) {
      setLocationWarning('GPS accuracy is approximate. Please enter your actual area/locality and exact landmark.');
    }
  };

  const buildLiveEvidenceGeoTag = (finalLocation) => {
    if (!liveEvidence?.file) return null;
    if (!liveEvidence.geoTag) return null;

    const finalLat = finalLocation?.lat ?? finalLocation?.coordinates?.lat ?? null;
    const finalLng = finalLocation?.lng ?? finalLocation?.coordinates?.lng ?? null;
    const finalAddress = finalLocation?.finalAddress || finalLocation?.displayAddress || finalLocation?.suggestedAddress || finalLocation?.address || form.location || '';
    const evidenceCapturedAt = liveEvidence.geoTag?.evidenceCapturedAt || liveEvidence.geoTag?.capturedAt || new Date().toISOString();
    const usesConfirmedComplaintLocation = liveEvidence.geoTag?.usedConfirmedComplaintLocation !== false && Boolean(finalLocation);
    const capturedGeoTag = liveEvidence.geoTag?.rawCaptureGeoTag || liveEvidence.geoTag;
    const rawCaptureGeoTag = capturedGeoTag
      ? {
          lat: capturedGeoTag.lat ?? null,
          lng: capturedGeoTag.lng ?? null,
          accuracy: capturedGeoTag.accuracy ?? null,
          address: capturedGeoTag.address || '',
          source: capturedGeoTag.source || 'GPS',
        }
      : null;

    if (!usesConfirmedComplaintLocation) {
      return {
        ...(liveEvidence.geoTag || {}),
        evidenceCapturedAt,
        capturedAt: evidenceCapturedAt,
        evidenceType: 'LIVE_GEO_TAGGED',
        usedConfirmedComplaintLocation: false,
        confirmedFromComplaintLocation: false,
        landmark: liveEvidence.landmark || liveEvidence.geoTag?.landmark || finalLocation?.landmark || '',
        address: liveEvidence.geoTag?.address || '',
        complaintLocation: finalLocation
          ? {
              lat: finalLat,
              lng: finalLng,
              accuracy: finalLocation.accuracy ?? null,
              address: finalAddress,
              landmark: finalLocation.landmark || '',
            }
          : null,
      };
    }

    return {
      ...finalLocation,
      lat: finalLat,
      lng: finalLng,
      accuracy: finalLocation?.accuracy ?? liveEvidence.geoTag?.accuracy ?? null,
      evidenceCapturedAt,
      capturedAt: evidenceCapturedAt,
      evidenceType: 'LIVE_GEO_TAGGED',
      source: finalLocation?.source || liveEvidence.geoTag?.source || 'GPS',
      landmark: finalLocation?.landmark || liveEvidence.landmark || liveEvidence.geoTag?.landmark || '',
      address: finalAddress || liveEvidence.geoTag?.address || '',
      finalAddress,
      confirmedFromComplaintLocation: Boolean(finalLocation),
      usedConfirmedComplaintLocation: true,
      rawCaptureGeoTag,
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

    if (hasLiveEvidence && Number(liveEvidence?.authenticity?.score) < 50) {
      const continueWithReview = window.confirm('This evidence may need manual verification. Continue submitting?');
      if (!continueWithReview) return;
    }

    if (hasLiveEvidence && liveEvidence?.authenticity?.screenSpoofRisk === 'High') {
      const continueWithSpoofRisk = window.confirm('Possible screen/photo replay detected. This evidence may need manual verification. Continue submitting?');
      if (!continueWithSpoofRisk) return;
    }

    setLoading(true);
    try {
      const fieldsForSubmit = {
        ...locationFieldsRef.current,
        address: locationFieldsRef.current.address?.trim() || form.location,
      };
      const finalLocation = confirmedLocation
        ? buildLocationPayload(
            fieldsForSubmit,
            confirmedLocation,
            form.locationSource || confirmedLocation.source || 'Manual',
            { confirmedByUser: locationConfirmed || confirmedLocation.confirmedByUser }
          )
        : buildLocationPayload(
            fieldsForSubmit,
            null,
            form.locationSource || 'Manual',
            { confirmedByUser: locationConfirmed }
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
        locationConfirmed: finalLocation.confirmedByUser,
      };

      let res;

      if (hasLiveEvidence) {
        const formData = new FormData();
        appendPayloadToFormData(formData, payload);

        const liveGeoTag = buildLiveEvidenceGeoTag(finalLocation);
        const evidenceFiles = liveEvidence.files?.length ? liveEvidence.files : [liveEvidence.file];
        const evidenceAuthenticity = {
          ...(liveEvidence.authenticity || {}),
          challengePrompt: liveEvidence.challengePrompt || liveEvidence.authenticity?.challengePrompt || '',
          challengeCompleted: Boolean(liveEvidence.challengeCompleted || liveEvidence.authenticity?.challengeCompleted),
          usedLiveCamera: liveEvidence.usedLiveCamera ?? liveEvidence.authenticity?.usedLiveCamera ?? true,
          evidenceCount: evidenceFiles.length,
          geoTag: liveGeoTag,
          screenSpoofRisk: liveEvidence.screenSpoofRisk || liveEvidence.authenticity?.screenSpoofRisk || 'Low',
          spoofScore: liveEvidence.spoofScore ?? liveEvidence.authenticity?.spoofScore ?? 0,
          spoofSignals: liveEvidence.spoofSignals || liveEvidence.authenticity?.spoofSignals || [],
          spoofWarnings: liveEvidence.spoofWarnings || liveEvidence.authenticity?.spoofWarnings || [],
        };

        for (const [index, evidenceFile] of evidenceFiles.entries()) {
          let liveFile = evidenceFile;
          try {
            liveFile = await watermarkImage(evidenceFile, liveGeoTag, liveGeoTag?.landmark || '');
          } catch (error) {
            console.warn('Evidence watermarking skipped:', error);
          }

          formData.append('liveEvidence', liveFile, liveFile.name || evidenceFile.name || `live-evidence-${index + 1}.jpg`);
        }
        formData.append('liveEvidenceGeoTag', JSON.stringify(liveGeoTag));
        formData.append('evidenceAuthenticity', JSON.stringify(evidenceAuthenticity));
        formData.append('evidenceFingerprint', liveEvidence.evidenceFingerprint || buildEvidenceFingerprintBundle(evidenceFiles));
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
    confirmedLocation?.mapDisplayAddress || confirmedLocation?.suggestedAddress || confirmedLocation?.displayAddress || confirmedLocation?.address || ''
  );
  const accuracyStatus = getAccuracyStatus(confirmedLocation?.accuracy);
  const gpsAccuracy = Number(confirmedLocation?.accuracy);
  const locationMainAddress = cleanDisplayAddress(
    confirmedLocation?.finalAddress
    || confirmedLocation?.displayAddress
    || confirmedLocation?.address
    || suggestedMapAddress
    || form.location
    || ''
  );
  const hasEditedLocationDetails = Boolean(
    locationFields.landmark?.trim()
    || locationFields.pincode?.trim()
    || locationFields.area?.trim()
  );
  const showFinalLocationPreview = showLocationEdit || hasEditedLocationDetails;
  const compactLocationWarning = locationWarning
    || (Number.isFinite(gpsAccuracy) && gpsAccuracy > 80 ? 'Location is approximate. Add landmark for better routing.' : '');
  const locationAccuracyText = Number.isFinite(gpsAccuracy) ? `${Math.round(gpsAccuracy)}m` : 'Not reported';
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
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{text('deep.grievanceSubmit', "Grievance Submitted!")}</h1>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem', fontSize: '1.125rem' }}>{text('deep.yourComplaintHa', "Your complaint has been filed and is being processed by our AI system.")}</p>
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600 }}>{text('deep.trackingID', "Tracking ID")}</span>
            <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.125rem' }}>{success.trackingId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{text('deep.category', "Category")}</span>
            <span style={{ fontWeight: 600 }}>{success.category}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{text('deep.department', "Department")}</span>
            <span style={{ fontWeight: 600 }}>{success.department}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{text('deep.priority', "Priority")}</span>
            <span className={`badge badge-${success.priority}`}>{success.priority}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary civic-gradient-button">{text('deep.goToDashboard', "Go to Dashboard")}</button>
          <button onClick={() => { setSuccess(null); setStep(1); setLiveEvidence(null); setForm({ ...form, title: '', description: '', category: '', location: '', dateOfIncident: '' }); }} className="btn btn-outline warm-outline-button">{text('deep.fileAnother', "File Another")}</button>
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
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{text('deep.newGrievance', "New Grievance")}</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)' }}>{text('deep.pleaseProvideTh', "Please provide the details of your issue to help us route it to the appropriate department.")}</p>
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>{text('deep.contactInformat', "Contact Information")}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenName">{text('deep.fullName', "Full Name")}</label>
                    <input id="citizenName" className="form-input" type="text" value={form.citizenName} onChange={e => setForm({ ...form, citizenName: e.target.value })} placeholder={text('deep.yourFullName', "Your full name")} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenEmail">{text('deep.emailAddress', "Email Address")}</label>
                    <input id="citizenEmail" className="form-input" type="email" value={form.citizenEmail} onChange={e => setForm({ ...form, citizenEmail: e.target.value })} placeholder={text('deep.youExampleCom', "you@example.com")} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenPhone">{text('deep.phoneNumber', "Phone Number")}</label>
                    <input id="citizenPhone" className="form-input" type="tel" value={form.citizenPhone} onChange={e => setForm({ ...form, citizenPhone: e.target.value })} placeholder="9876543210" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>{text('deep.incidentDetails', "Incident Details")}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="title">Grievance Title</label>
                    <input id="title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={text('deep.brieflyDescribe', "Briefly describe your issue")} required />
                  </div>
                  <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(14,165,164,0.05))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,164,0.15)', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                      <Mic size={18} />
                      <span style={{ fontSize: '0.875rem' }}>{text('deep.voiceFirstGriev', "Voice-First Grievance Intake")}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{text('deep.citizensCanSpea', "Citizens can speak naturally in Hindi, English, or Hinglish. CivicTrust will help structure the complaint.")}</p>
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
                      <label className="form-label" htmlFor="dateOfIncident">{text('deep.dateOfIncident', "Date of Incident")}</label>
                      <input id="dateOfIncident" className="form-input" type="date" value={form.dateOfIncident} onChange={e => setForm({ ...form, dateOfIncident: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{text('deep.location', "Location")}</label>
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
                              if (confirmedLocation) {
                                setConfirmedLocation(current => buildLocationPayload(
                                  next,
                                  current || confirmedLocation,
                                  form.locationSource || current?.source || 'Manual',
                                  { confirmedByUser: false }
                                ));
                              }
                              return next;
                            });
                            setLocationConfirmed(false);
                          }}
                          placeholder={text('deep.addressOrLandma', "Address or landmark")}
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

                  {!confirmedLocation && (
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
                    {confirmedLocation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          padding: 'clamp(1rem, 2vw, 1.25rem)',
                          background: 'rgba(236,254,255,0.46)',
                          borderRadius: '1rem',
                          border: '1px solid rgba(14,165,164,0.16)',
                          marginBottom: '1rem',
                          boxShadow: '0 12px 32px rgba(15,23,42,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: '0.82rem', fontWeight: 900, marginBottom: '0.35rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {confirmedLocation.source === 'QR' ? 'Location from QR Zone' : 'Detected Location'}
                            </h4>
                            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                              {locationMainAddress || 'Address not available'}
                            </p>
                          </div>
                          {locationConfirmed && (
                            <span className="badge badge-resolved" style={{ flexShrink: 0 }}>
                              Confirmed
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', color: 'var(--on-surface-variant)', fontSize: '0.74rem', lineHeight: 1.45, marginBottom: compactLocationWarning ? '0.65rem' : '0.85rem' }}>
                          <span>Lat: {formatCoordinate(confirmedLocation.lat)}</span>
                          <span>|</span>
                          <span>Lng: {formatCoordinate(confirmedLocation.lng)}</span>
                          <span>|</span>
                          <span>Accuracy: {locationAccuracyText}</span>
                          <span>|</span>
                          <span style={{ color: accuracyStatus.tone, fontWeight: 800 }}>{accuracyStatus.label}</span>
                        </div>

                        {compactLocationWarning && (
                          <div style={{
                            padding: '0.55rem 0.65rem',
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: '0.65rem',
                            marginBottom: '0.85rem',
                            display: 'flex',
                            gap: '0.45rem',
                            alignItems: 'flex-start',
                          }}>
                            <AlertCircle size={13} color="#b45309" style={{ marginTop: '0.08rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#9a5f00', lineHeight: 1.4 }}>{compactLocationWarning}</span>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr))', gap: '0.5rem' }}>
                          <button
                            onClick={handleUseDetectedLocation}
                            className="btn btn-sm btn-primary"
                            style={{ justifyContent: 'center' }}
                          >
                            <Check size={14} style={{ marginRight: '0.25rem' }} />Use Location</button>
                          <button
                            onClick={handleEditLocation}
                            className="btn btn-sm btn-outline"
                            style={{ justifyContent: 'center' }}
                          >
                            <Edit2 size={14} style={{ marginRight: '0.25rem' }} />Edit Details</button>
                          {confirmedLocation.source === 'GPS' && (
                            <button
                              onClick={handleRedetectLocation}
                              className="btn btn-sm btn-outline"
                              style={{ justifyContent: 'center' }}
                            >
                              <Navigation size={14} style={{ marginRight: '0.25rem' }} />Re-detect</button>
                          )}
                        </div>

                        <AnimatePresence>
                          {showLocationEdit && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(14,165,164,0.16)' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 850, marginBottom: '0.35rem', color: 'var(--on-surface)' }}>Confirm Location Details</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.8rem', lineHeight: 1.45 }}>
                                  Map address is approximate. Please confirm exact landmark and pincode.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '0.75rem' }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="detectedArea">Area / Locality</label>
                                    <input id="detectedArea" className="form-input" type="text" value={locationFields.area} onChange={e => updateLocationFields({ area: e.target.value })} placeholder="Example: Anand Nagar" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="detectedLandmark">Exact Landmark / Place</label>
                                    <input id="detectedLandmark" className="form-input" type="text" value={locationFields.landmark} onChange={e => updateLocationFields({ landmark: e.target.value })} placeholder="Example: Bansal College Main Gate" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="quickPincode">Pincode</label>
                                    <input id="quickPincode" className="form-input" type="text" inputMode="numeric" value={locationFields.pincode} onChange={e => updateLocationFields({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="Example: 462022" maxLength={6} />
                                    {locationFields.pincode && !/^\d{6}$/.test(locationFields.pincode) && (
                                      <p style={{ fontSize: '0.6875rem', color: '#e65100', marginTop: '0.25rem' }}>{text('deep.EnterAValid6Dig', "Enter a valid 6-digit Indian pincode.")}</p>
                                    )}
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="ward">Ward</label>
                                    <input id="ward" className="form-input" type="text" value={locationFields.ward} onChange={e => updateLocationFields({ ward: e.target.value })} placeholder="Example: Ward 1" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="zone">Zone</label>
                                    <input id="zone" className="form-input" type="text" value={locationFields.zone} onChange={e => updateLocationFields({ zone: e.target.value })} placeholder="Example: North Zone" />
                                  </div>
                                </div>

                                {showFinalLocationPreview && (
                                  <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: 'rgba(255,255,255,0.82)', borderRadius: '0.75rem', border: '1px solid rgba(14,165,164,0.15)' }}>
                                    {finalLocationPreview ? (
                                      <p style={{ fontSize: '0.83rem', color: 'var(--on-surface)', lineHeight: 1.45, fontWeight: 700, overflowWrap: 'anywhere' }}>Final: {finalLocationPreview}</p>
                                    ) : (
                                      <p style={{ fontSize: '0.83rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>Final: {locationMainAddress || 'Add details to preview final location.'}</p>
                                    )}
                                    <p style={{ marginTop: '0.35rem', fontSize: '0.68rem', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>
                                      Lat {formatCoordinate(confirmedLocation.lat)} | Lng {formatCoordinate(confirmedLocation.lng)}
                                    </p>
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                                  <button onClick={handleSaveManualLocation} className="btn btn-sm btn-primary" style={{ flex: '1 1 9rem' }}>
                                    <Check size={14} style={{ marginRight: '0.25rem' }} />Save Details
                                  </button>
                                  <button onClick={() => setShowLocationEdit(false)} className="btn btn-sm btn-outline" style={{ flex: '1 1 9rem' }}>
                                    Collapse
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
                    {showLocationEdit && !confirmedLocation && (
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
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--on-surface)' }}>{text('deep.editLocationDet', "Edit Location Details")}</h4>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" htmlFor="manualLandmark">{t('grievance.exactLandmark')}</label>
                          <input id="manualLandmark" className="form-input" type="text" value={locationFields.landmark} onChange={e => updateLocationFields({ landmark: e.target.value })} placeholder="Example: Bansal College, Main Gate, Near Canteen" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label" htmlFor="city">{text('deep.cityTown', "City / Town")}</label>
                            <input id="city" className="form-input" type="text" value={locationFields.city} onChange={e => updateLocationFields({ city: e.target.value })} placeholder="e.g. Bhopal" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="area">{text('deep.area', "Area")}</label>
                            <input id="area" className="form-input" type="text" value={locationFields.area} onChange={e => updateLocationFields({ area: e.target.value })} placeholder="e.g. Anand Nagar" />
                          </div>
                          {/* Part B: Ward, Zone, State, Pincode with correct placeholders */}
                          <div className="form-group">
                            <label className="form-label" htmlFor="ward">{text('deep.ward', "Ward")}</label>
                            <input id="ward" className="form-input" type="text" value={locationFields.ward} onChange={e => updateLocationFields({ ward: e.target.value })} placeholder="Example: Ward 1" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="zone">{text('deep.zone', "Zone")}</label>
                            <input id="zone" className="form-input" type="text" value={locationFields.zone} onChange={e => updateLocationFields({ zone: e.target.value })} placeholder="Example: North Zone" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="state">{text('deep.state', "State")}</label>
                            <input id="state" className="form-input" type="text" value={locationFields.state} onChange={e => updateLocationFields({ state: e.target.value })} placeholder="e.g. Madhya Pradesh" />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="pincode">{text('deep.pincode', "Pincode")}</label>
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
                              <p style={{ fontSize: '0.6875rem', color: '#e65100', marginTop: '0.25rem' }}>{text('deep.EnterAValid6Dig', "Enter a valid 6-digit Indian pincode.")}</p>
                            )}
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="address">{text('deep.fullAddress', "Full Address")}</label>
                          <input id="address" className="form-input" type="text" value={locationFields.address} onChange={e => updateLocationFields({ address: e.target.value })} placeholder={text('deep.completeAddress', "Complete address")} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={handleSaveManualLocation}
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1 }}
                          >
                            <Check size={14} style={{ marginRight: '0.25rem' }} />{text('deep.saveChanges', "Save Changes")}</button>
                          <button
                            onClick={() => setShowLocationEdit(false)}
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1 }}
                          >{text('deep.cancel', "Cancel")}</button>
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
                        <span style={{ flex: 1 }}>ðŸ“ Old QR Zone location found. Not using it for this complaint. <strong>{text('deep.zonex', "Zone:")}</strong> {qrContext.zoneName}</span>
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
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{text('deep.captureAFreshPh', "Capture a fresh photo from the complaint location. CivicTrust will attach GPS coordinates and timestamp for verification.")}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem', lineHeight: 1.45 }}>Evidence capture will request fresh GPS. If GPS is denied, keep the photo and enter a landmark manually.</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem', lineHeight: 1.45 }}>To reduce fake or reused evidence, CivicTrust checks live capture, GPS, timestamp, random challenge completion, and evidence consistency. This does not guarantee 100% deepfake detection, but helps officers identify suspicious evidence.</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--primary)', marginTop: '0.35rem', fontWeight: 700 }}>{text('deep.liveGeoTaggedCa', "Live geo-tagged capture is recommended for evidence verification.")}</p>
                    </div>
                    <LiveGeoTaggedCapture
                      confirmedLocation={confirmedLocation}
                      onEvidenceChange={setLiveEvidence}
                      onLocationCaptured={handleEvidenceLocationCaptured}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>{text('deep.reviewSubmit', "Review & Submit")}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>{text('deep.contact', "Contact")}</p>
                    <p style={{ fontWeight: 600 }}>{form.citizenName}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{form.citizenEmail} {form.citizenPhone && `â€¢ ${form.citizenPhone}`}</p>
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>Grievance Title</p>
                    <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{form.title}</p>
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>{text('deep.description', "Description")}</p>
                    <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{form.description}</p>
                  </div>
                  {form.location && (
                    <div>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>{text('deep.location', "Location")}</p>
                      <p>{form.location}</p>
                    </div>
                  )}
                  {liveEvidence?.file && (
                    <div style={{ padding: '1rem', background: 'rgba(14,165,164,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,164,0.18)' }}>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>{text('deep.liveGeoTaggedEv', "Live Geo-Tagged Evidence")}</p>
                      <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {(liveEvidence.captures?.length ? liveEvidence.captures : [{ previewUrl: liveEvidence.previewUrl }]).map((capture, index) => (
                            capture.previewUrl && (
                              <img key={`${capture.previewUrl}-${index}`} src={capture.previewUrl} alt={`Live captured evidence ${index + 1}`} style={{ width: '5.5rem', height: '4.25rem', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,164,0.22)', flexShrink: 0 }} />
                            )
                          ))}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{liveEvidence.file.name}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                            {Number.isFinite(Number(liveEvidence.geoTag?.lat)) && Number.isFinite(Number(liveEvidence.geoTag?.lng))
                              ? `GPS: ${Number(liveEvidence.geoTag.lat).toFixed(6)}, ${Number(liveEvidence.geoTag.lng).toFixed(6)}`
                              : 'Photo captured, but GPS permission was denied. Please allow location or enter landmark manually.'}
                          </p>
                          {liveEvidence.authenticity && (
                            <p style={{ fontSize: '0.8125rem', color: Number(liveEvidence.authenticity.score) < 50 ? 'var(--error)' : 'var(--primary)', marginTop: '0.25rem', fontWeight: 700 }}>
                              Authenticity: {liveEvidence.authenticity.score}% - {liveEvidence.authenticity.status}
                            </p>
                          )}
                          {liveEvidence.authenticity?.screenSpoofRisk && (
                            <p style={{ fontSize: '0.8125rem', color: liveEvidence.authenticity.screenSpoofRisk === 'High' ? 'var(--error)' : liveEvidence.authenticity.screenSpoofRisk === 'Medium' ? '#b45309' : 'var(--success)', marginTop: '0.25rem', fontWeight: 700 }}>
                              Screen Spoof Risk: {liveEvidence.authenticity.screenSpoofRisk}
                            </p>
                          )}
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
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{text('deep.priorityx', "Priority: ")}<span className={`badge badge-${aiClassification.priority}`}>{aiClassification.priority}</span>
                      </p>
                    </div>
                  )}

                  <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-container-high)', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      <ShieldAlert size={18} />
                      <span style={{ fontSize: '0.875rem' }}>{text('deep.privacyFirstGri', "Privacy-first grievance processing")}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>{text('deep.civicTrustUsesY', "CivicTrust uses your complaint data only for classification, routing, tracking, and resolution. Sensitive information is automatically masked before AI processing to ensure privacy by design.")}</p>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.privacyConsent}
                        onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                        style={{ marginTop: '0.25rem', width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.4 }}>{text('deep.iConsentToThePr', "I consent to the processing of my complaint data for classification, routing, tracking, and resolution.")}</span>
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
            >{text('deep.back', "Back")}</button>
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
                  <>{text('deep.submitGrievance', "Submit Grievance")}<span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>send</span></>
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
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{text('deep.suggestedRoute', "Suggested Route")}</span>
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
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{text('deep.sentiment', "Sentiment")}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>{aiNeedsReview ? 'Needs Review' : (aiClassification.sentiment || 'Neutral')}</span>
                      {aiNeedsReview ? <AlertTriangle size={14} color="#f59e0b" /> : (aiClassification.isUrgent || aiClassification.priority === 'high') && <AlertCircle size={14} color="var(--error)" />}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{text('deep.language', "Language")}</p>
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
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{text('deep.evidenceVerific', "Evidence Verification")}</p>
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
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{text('deep.otherPossibilit', "Other Possibilities")}</p>
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
                <p style={{ fontSize: '0.8125rem' }}>{text('deep.startTypingYour', "Start typing your complaint to see AI routing suggestions.")}</p>
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
