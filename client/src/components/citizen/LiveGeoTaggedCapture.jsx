import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Camera, CheckCircle, Loader2, Navigation, RefreshCw, Shield, Trash2, Video, X } from 'lucide-react';
import { reverseGeocode } from '../../utils/locationHelper';
import { cleanDisplayAddress } from '../../utils/cleanAddress';
import { buildEvidenceFingerprintBundle, calculateEvidenceAuthenticity, detectScreenReplayRisk } from '../../utils/evidenceAuthenticity';

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0
};

const AUTHENTICITY_CHALLENGES = [
  'Capture the issue with surrounding road/building visible.',
  'Move camera slightly left and capture again.',
  'Include nearby landmark or signboard.',
  'Capture a wider context photo.'
];

const REQUIRED_CAPTURE_COUNT = 2;
const MAX_CAPTURE_COUNT = 3;

const getCameraConstraints = (mode, exact = false) => ({
  audio: false,
  video: {
    facingMode: exact ? { exact: mode } : { ideal: mode },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});

const getLocationAddress = (location) => {
  if (!location) return '';
  const address = location.finalAddress
    || location.displayAddress
    || location.suggestedAddress
    || location.address
    || '';
  return cleanDisplayAddress(address) || address;
};

const summarizeGeoTag = (geoTag) => (
  geoTag
    ? {
        lat: geoTag.lat ?? null,
        lng: geoTag.lng ?? null,
        accuracy: geoTag.accuracy ?? null,
        address: geoTag.address || '',
        source: geoTag.source || 'GPS',
        capturedAt: geoTag.capturedAt || geoTag.evidenceCapturedAt || null,
      }
    : null
);

const getAccuracyStatus = (accuracy) => {
  const meters = Number(accuracy);
  if (!Number.isFinite(meters)) return { label: 'Not reported', tone: 'var(--on-surface-variant)' };
  if (meters <= 50) return { label: 'Good', tone: '#0d9488' };
  if (meters <= 250) return { label: 'Moderate', tone: '#ef9900' };
  return { label: 'Low', tone: '#dc2626' };
};

const formatAccuracy = (accuracy) => {
  const meters = Number(accuracy);
  if (!Number.isFinite(meters)) return 'N/A';
  const status = getAccuracyStatus(meters);
  return `${Math.round(meters)} m ${status.label}`;
};

export default function LiveGeoTaggedCapture({ confirmedLocation, onEvidenceChange, onStatusChange, onLocationCaptured }) {
  const [status, setStatus] = useState('idle');
  const [evidence, setEvidence] = useState(null);
  const [landmark, setLandmark] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [challengePrompt, setChallengePrompt] = useState(() => (
    AUTHENTICITY_CHALLENGES[Math.floor(Math.random() * AUTHENTICITY_CHALLENGES.length)]
  ));
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const phoneCameraInputRef = useRef(null);
  const lastNativeInputRef = useRef(null);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  const showHttpsWarning = typeof window !== 'undefined'
    && window.location.protocol !== 'https:'
    && !isLocalHost;
  const isLikelyMobile = typeof navigator !== 'undefined'
    && (
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    );
  const canUseLivePreview = typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia);

  const formatCoord = (value) => (
    value != null && Number.isFinite(Number(value)) ? Number(value).toFixed(6) : 'N/A'
  );

  const formatDate = (value) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const selectChallengePrompt = useCallback(() => {
    const nextPrompt = AUTHENTICITY_CHALLENGES[Math.floor(Math.random() * AUTHENTICITY_CHALLENGES.length)];
    setChallengePrompt(nextPrompt);
    return nextPrompt;
  }, []);

  const getActiveChallengePrompt = useCallback(() => (
    challengePrompt || selectChallengePrompt()
  ), [challengePrompt, selectChallengePrompt]);

  const buildAuthenticity = useCallback((captures, geoTag, options = {}) => {
    const files = (captures || []).map((capture) => capture.file).filter(Boolean);
    const challengeDone = options.challengeCompleted ?? files.length >= REQUIRED_CAPTURE_COUNT;
    const usedCamera = options.usedLiveCamera ?? true;
    const duplicateRisk = options.duplicateRisk ?? false;
    const aiRelevance = options.aiRelevance || 'Pending';
    const result = calculateEvidenceAuthenticity({
      evidenceFiles: files,
      geoTag,
      challengeCompleted: challengeDone,
      usedLiveCamera: usedCamera,
      duplicateRisk,
      aiRelevance,
      screenSpoofRisk: options.screenSpoofRisk || 'Low',
      spoofScore: options.spoofScore || 0,
      spoofSignals: options.spoofSignals || [],
      spoofWarnings: options.spoofWarnings || [],
    });

    return {
      ...result,
      challengePrompt: options.challengePrompt || challengePrompt || '',
      challengeCompleted: challengeDone,
      usedLiveCamera: usedCamera,
      duplicateRisk,
      aiRelevance,
      screenSpoofRisk: result.screenSpoofRisk,
      spoofScore: result.spoofScore,
      spoofSignals: result.spoofSignals,
      spoofWarnings: result.spoofWarnings,
      evidenceCount: files.length,
      geoTag,
    };
  }, [challengePrompt]);

  const hasConfirmedLocation = Boolean(
    confirmedLocation
    && Number.isFinite(Number(confirmedLocation.lat ?? confirmedLocation.coordinates?.lat))
    && Number.isFinite(Number(confirmedLocation.lng ?? confirmedLocation.coordinates?.lng))
  );

  const geoTagMatchesConfirmedLocation = useCallback((geoTag) => {
    if (!geoTag || !hasConfirmedLocation) return false;
    const confirmedLat = Number(confirmedLocation.lat ?? confirmedLocation.coordinates?.lat);
    const confirmedLng = Number(confirmedLocation.lng ?? confirmedLocation.coordinates?.lng);
    const evidenceLat = Number(geoTag.lat);
    const evidenceLng = Number(geoTag.lng);
    return Number.isFinite(confirmedLat)
      && Number.isFinite(confirmedLng)
      && Number.isFinite(evidenceLat)
      && Number.isFinite(evidenceLng)
      && Math.abs(confirmedLat - evidenceLat) < 0.000001
      && Math.abs(confirmedLng - evidenceLng) < 0.000001;
  }, [confirmedLocation, hasConfirmedLocation]);

  const buildConfirmedGeoTag = useCallback((rawGeoTag = {}, evidenceLandmark = '') => {
    if (!hasConfirmedLocation) return rawGeoTag || null;

    const confirmedLat = confirmedLocation.lat ?? confirmedLocation.coordinates?.lat ?? null;
    const confirmedLng = confirmedLocation.lng ?? confirmedLocation.coordinates?.lng ?? null;
    const hasConfirmedCoords = Number.isFinite(Number(confirmedLat)) && Number.isFinite(Number(confirmedLng));
    const confirmedAddress = getLocationAddress(confirmedLocation);
    const confirmedLandmark = (confirmedLocation.landmark || evidenceLandmark || '').trim();
    const capturedAt = rawGeoTag?.evidenceCapturedAt || rawGeoTag?.capturedAt || new Date().toISOString();
    const rawCaptureGeoTag = rawGeoTag?.rawCaptureGeoTag
      || (rawGeoTag?.usedConfirmedComplaintLocation === false ? summarizeGeoTag(rawGeoTag) : null);

    return {
      ...(rawGeoTag || {}),
      ...confirmedLocation,
      lat: hasConfirmedCoords ? Number(confirmedLat) : rawGeoTag?.lat ?? null,
      lng: hasConfirmedCoords ? Number(confirmedLng) : rawGeoTag?.lng ?? null,
      accuracy: confirmedLocation.accuracy ?? rawGeoTag?.accuracy ?? null,
      capturedAt,
      evidenceCapturedAt: capturedAt,
      source: confirmedLocation.source || rawGeoTag?.source || 'GPS',
      address: confirmedAddress || rawGeoTag?.address || '',
      displayAddress: confirmedLocation.displayAddress || confirmedAddress || rawGeoTag?.displayAddress || '',
      finalAddress: confirmedLocation.finalAddress || confirmedAddress || rawGeoTag?.finalAddress || '',
      suggestedAddress: confirmedLocation.suggestedAddress || rawGeoTag?.suggestedAddress || '',
      landmark: confirmedLandmark,
      evidenceType: 'LIVE_GEO_TAGGED',
      usedConfirmedComplaintLocation: true,
      confirmedFromComplaintLocation: true,
      evidenceGpsRefreshed: false,
      rawCaptureGeoTag,
    };
  }, [confirmedLocation, hasConfirmedLocation]);

  const mergeConfirmedLocation = useCallback((nextEvidence) => {
    if (!nextEvidence || !hasConfirmedLocation) return nextEvidence;
    if (nextEvidence.skipConfirmedLocationMerge || nextEvidence.geoTag?.usedConfirmedComplaintLocation === false) {
      return nextEvidence;
    }
    if (nextEvidence.geoTag?.evidenceGpsRefreshed && !geoTagMatchesConfirmedLocation(nextEvidence.geoTag)) {
      return nextEvidence;
    }

    const mergedGeoTag = buildConfirmedGeoTag(nextEvidence.geoTag || {}, nextEvidence.landmark);

    return {
      ...nextEvidence,
      landmark: mergedGeoTag?.landmark || nextEvidence.landmark || '',
      geoTag: mergedGeoTag,
    };
  }, [buildConfirmedGeoTag, geoTagMatchesConfirmedLocation, hasConfirmedLocation]);

  useEffect(() => {
    if (!evidence || !hasConfirmedLocation) return;
    if (evidence.skipConfirmedLocationMerge || evidence.geoTag?.usedConfirmedComplaintLocation === false) return;
    if (evidence.geoTag?.evidenceGpsRefreshed && !geoTagMatchesConfirmedLocation(evidence.geoTag)) return;

    const updatedEvidence = mergeConfirmedLocation(evidence);
    const currentGeoTag = evidence.geoTag || {};
    const updatedGeoTag = updatedEvidence?.geoTag || {};
    const changed = (
      currentGeoTag.lat !== updatedGeoTag.lat
      || currentGeoTag.lng !== updatedGeoTag.lng
      || currentGeoTag.accuracy !== updatedGeoTag.accuracy
      || currentGeoTag.address !== updatedGeoTag.address
      || currentGeoTag.landmark !== updatedGeoTag.landmark
      || currentGeoTag.usedConfirmedComplaintLocation !== updatedGeoTag.usedConfirmedComplaintLocation
      || evidence.landmark !== updatedEvidence?.landmark
    );

    if (!changed) return;

    if (landmark !== (updatedEvidence?.landmark || '')) {
      setLandmark(updatedEvidence?.landmark || '');
    }
    setEvidence(updatedEvidence);
    onEvidenceChange?.(updatedEvidence);
  }, [evidence, geoTagMatchesConfirmedLocation, hasConfirmedLocation, landmark, mergeConfirmedLocation, onEvidenceChange]);

  const stopCamera = useCallback(() => {
    setVideoReady(false);
    setCameraStream((stream) => {
      stream?.getTracks?.().forEach((track) => track.stop());
      return null;
    });
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const markVideoReady = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const track = cameraStream?.getVideoTracks?.()[0];
    const hasFrame = video.readyState >= 2 || (video.videoWidth > 0 && video.videoHeight > 0);
    const streamIsLive = track?.readyState === 'live';

    if (hasFrame || streamIsLive) {
      setVideoReady(true);
      setCameraError('');
    }
  }, [cameraStream]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    if (status !== 'camera' || !cameraStream || !videoRef.current) return;

    const video = videoRef.current;
    setVideoReady(false);
    video.srcObject = cameraStream;

    video.addEventListener('loadedmetadata', markVideoReady);
    video.addEventListener('canplay', markVideoReady);
    video.addEventListener('playing', markVideoReady);

    const playPromise = video.play?.();
    playPromise?.then?.(markVideoReady)?.catch?.(() => {
      setCameraError('Camera preview could not start. Please check browser camera permissions.');
    });

    const readinessInterval = window.setInterval(markVideoReady, 250);
    const readinessTimer = window.setTimeout(() => {
      const track = cameraStream.getVideoTracks?.()[0];
      if (track?.readyState === 'live') {
        setVideoReady(true);
        setCameraError('');
        return;
      }

      if (!video.videoWidth || !video.videoHeight) {
        setCameraError('Camera opened, but the preview frame is not available yet. Please wait a moment or try again.');
      }
    }, 3500);

    return () => {
      window.clearInterval(readinessInterval);
      window.clearTimeout(readinessTimer);
      video.removeEventListener('loadedmetadata', markVideoReady);
      video.removeEventListener('canplay', markVideoReady);
      video.removeEventListener('playing', markVideoReady);
    };
  }, [cameraStream, markVideoReady, status]);

  useEffect(() => () => {
    cameraStream?.getTracks?.().forEach((track) => track.stop());
  }, [cameraStream]);

  const publishEvidence = (nextEvidence, nextStatus = 'preview', options = {}) => {
    const shouldUseConfirmedLocation = options.useConfirmedLocation !== false;
    const evidenceWithConfirmedLocation = shouldUseConfirmedLocation
      ? mergeConfirmedLocation(nextEvidence)
      : nextEvidence;
    if (landmark !== (evidenceWithConfirmedLocation?.landmark || '')) {
      setLandmark(evidenceWithConfirmedLocation?.landmark || '');
    }
    setEvidence(evidenceWithConfirmedLocation);
    setStatus(nextStatus);
    onEvidenceChange?.(evidenceWithConfirmedLocation);
  };

  const publishCapturedFile = useCallback(async (file, previewUrl, geoTag, options = {}) => {
    const existingCaptures = options.resetCaptures ? [] : (evidence?.captures || []);
    const captureIndex = existingCaptures.length;
    const activeChallenge = options.challengePrompt || getActiveChallengePrompt();
    const capturedAt = geoTag?.capturedAt || geoTag?.evidenceCapturedAt || new Date().toISOString();
    const capture = {
      file,
      previewUrl,
      capturedAt,
      challengePrompt: activeChallenge,
      label: captureIndex === 0
        ? 'Primary issue photo'
        : captureIndex === 1
          ? 'Challenge photo'
          : 'Wider context photo',
    };
    const captures = [...existingCaptures, capture].slice(0, MAX_CAPTURE_COUNT);
    const files = captures.map((item) => item.file).filter(Boolean);
    const challengeCompleted = captures.length >= REQUIRED_CAPTURE_COUNT;
    const screenSpoofResult = options.screenSpoofResult || await detectScreenReplayRisk({
      imageFile: file,
      previewUrl,
      files,
      challengeCompleted,
      geoTag,
    });
    const nextLandmark = landmark || evidence?.landmark || confirmedLocation?.landmark || '';
    const authenticity = buildAuthenticity(captures, geoTag, {
      challengePrompt: activeChallenge,
      challengeCompleted,
      usedLiveCamera: options.usedLiveCamera ?? true,
      duplicateRisk: false,
      aiRelevance: 'Pending',
      screenSpoofRisk: screenSpoofResult.screenSpoofRisk,
      spoofScore: screenSpoofResult.spoofScore,
      spoofSignals: screenSpoofResult.signals,
      spoofWarnings: screenSpoofResult.warnings,
    });
    const primaryCapture = captures[0] || capture;
    const nextEvidence = {
      file: primaryCapture.file,
      previewUrl: primaryCapture.previewUrl,
      files,
      captures,
      landmark: nextLandmark,
      geoTag,
      authenticity,
      evidenceFingerprint: buildEvidenceFingerprintBundle(files),
      challengePrompt: activeChallenge,
      challengeCompleted,
      usedLiveCamera: options.usedLiveCamera ?? true,
      duplicateRisk: false,
      aiRelevance: 'Pending',
      screenSpoofRisk: screenSpoofResult.screenSpoofRisk,
      spoofScore: screenSpoofResult.spoofScore,
      spoofSignals: screenSpoofResult.signals,
      spoofWarnings: screenSpoofResult.warnings,
      skipConfirmedLocationMerge: options.useConfirmedLocation === false,
    };

    publishEvidence(nextEvidence, geoTag ? 'preview' : 'gps-denied', {
      useConfirmedLocation: options.useConfirmedLocation,
    });
  }, [buildAuthenticity, confirmedLocation?.landmark, evidence, getActiveChallengePrompt, landmark, publishEvidence]);

  const refreshEvidenceGeoTag = useCallback(async (geoTag) => {
    if (!evidence) return;
    const captures = evidence.captures || [{ file: evidence.file, previewUrl: evidence.previewUrl }];
    const files = captures.map((item) => item.file).filter(Boolean);
    const challengeCompleted = evidence.challengeCompleted || captures.length >= REQUIRED_CAPTURE_COUNT;
    const screenSpoofResult = await detectScreenReplayRisk({
      files,
      challengeCompleted,
      geoTag,
      imageFile: evidence.file,
      previewUrl: evidence.previewUrl,
    });
    const authenticity = buildAuthenticity(captures, geoTag, {
      challengePrompt: evidence.challengePrompt || challengePrompt,
      challengeCompleted,
      usedLiveCamera: evidence.usedLiveCamera ?? true,
      duplicateRisk: evidence.duplicateRisk ?? false,
      aiRelevance: evidence.aiRelevance || 'Pending',
      screenSpoofRisk: screenSpoofResult.screenSpoofRisk,
      spoofScore: screenSpoofResult.spoofScore,
      spoofSignals: screenSpoofResult.signals,
      spoofWarnings: screenSpoofResult.warnings,
    });

    publishEvidence({
      ...evidence,
      files,
      captures,
      geoTag,
      authenticity,
      evidenceFingerprint: buildEvidenceFingerprintBundle(files),
      screenSpoofRisk: screenSpoofResult.screenSpoofRisk,
      spoofScore: screenSpoofResult.spoofScore,
      spoofSignals: screenSpoofResult.signals,
      spoofWarnings: screenSpoofResult.warnings,
    }, 'preview', { useConfirmedLocation: false });
  }, [buildAuthenticity, challengePrompt, evidence, publishEvidence]);

  const requestGPS = async (file, previewUrl, options = {}) => {
    const refreshExisting = Boolean(options.refreshExisting);
    const shouldUseConfirmedLocation = options.useConfirmedLocation !== false;
    setStatus('gps');
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Photo captured, but GPS is not supported by this browser. Please enter the exact landmark.');
      if (refreshExisting && evidence) {
        setStatus('preview');
      } else {
        await publishCapturedFile(file, previewUrl, null, {
          useConfirmedLocation: false,
          usedLiveCamera: options.usedLiveCamera ?? true,
          challengePrompt: options.challengePrompt,
        });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const capturedAt = new Date().toISOString();
        let address = '';
        let suggestedAddress = '';

        try {
          const geocoded = await reverseGeocode(latitude, longitude);
          suggestedAddress = geocoded?.address || '';
          address = cleanDisplayAddress(suggestedAddress) || suggestedAddress;
        } catch {
          address = '';
        }

        const nextLandmark = landmark || evidence?.landmark || confirmedLocation?.landmark || '';
        const refreshedGeoTag = {
          lat: latitude,
          lng: longitude,
          accuracy,
          capturedAt,
          evidenceCapturedAt: capturedAt,
          source: 'GPS',
          address,
          displayAddress: address,
          finalAddress: address,
          suggestedAddress,
          landmark: nextLandmark,
          evidenceType: 'LIVE_GEO_TAGGED',
          usedConfirmedComplaintLocation: false,
          confirmedFromComplaintLocation: false,
          evidenceGpsRefreshed: refreshExisting,
          complaintLocationAccuracy: confirmedLocation?.accuracy ?? null,
        };
        if (refreshExisting && hasConfirmedLocation) {
          const useAsComplaintLocation = window.confirm('Use this updated GPS as complaint location too?');
          if (useAsComplaintLocation) {
            onLocationCaptured?.({
              ...refreshedGeoTag,
              confirmedByUser: true,
              landmark: nextLandmark,
            });
            await refreshEvidenceGeoTag(refreshedGeoTag);
            return;
          }
        }

        if (!hasConfirmedLocation) {
          onLocationCaptured?.({
            ...refreshedGeoTag,
            confirmedByUser: false,
            landmark: nextLandmark,
          });
        }

        if (refreshExisting && evidence) {
          await refreshEvidenceGeoTag(refreshedGeoTag);
          return;
        }

        await publishCapturedFile(file, previewUrl, refreshedGeoTag, {
          useConfirmedLocation: shouldUseConfirmedLocation,
          usedLiveCamera: options.usedLiveCamera ?? true,
          challengePrompt: options.challengePrompt,
        });
      },
      async (error) => {
        const deniedMessage = 'Photo captured, but GPS permission was denied. Please allow location or enter landmark manually.';
        const timeoutMessage = 'Photo captured, but GPS timed out. Please retry location or enter the exact landmark.';
        setGpsError(error.code === error.TIMEOUT ? timeoutMessage : deniedMessage);
        if (refreshExisting && evidence) {
          setStatus('preview');
        } else {
          await publishCapturedFile(file, previewUrl, null, {
            useConfirmedLocation: false,
            usedLiveCamera: options.usedLiveCamera ?? true,
            challengePrompt: options.challengePrompt,
          });
        }
      },
      GPS_OPTIONS
    );
  };

  const openNativeCapture = (inputRef, mode) => {
    stopCamera();
    setFacingMode(mode === 'user' ? 'user' : 'environment');
    setCameraError('');
    setGpsError('');
    lastNativeInputRef.current = inputRef;

    try {
      if (!inputRef.current) throw new Error('Camera input is unavailable');
      inputRef.current?.click();
    } catch {
      setCameraError('Camera could not be opened. Please check browser camera permission and try again.');
    }
  };

  const handlePrimaryCameraClick = () => {
    getActiveChallengePrompt();
    if (isLikelyMobile) {
      openNativeCapture(phoneCameraInputRef, 'environment');
      return;
    }

    lastNativeInputRef.current = null;
    startCamera(facingMode);
  };

  const handleFileCapture = (event) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    const isImageFile = file.type
      ? file.type.startsWith('image/')
      : /\.(gif|heic|heif|jpe?g|png|webp)$/i.test(file.name || '');

    if (!isImageFile) {
      setCameraError('Please choose an image file for live evidence.');
      return;
    }

    stopCamera();
    setStatus('capturing');
    setCameraError('');
    setGpsError('');

    const previewUrl = URL.createObjectURL(file);
    requestGPS(file, previewUrl, {
      useConfirmedLocation: false,
      usedLiveCamera: true,
      challengePrompt: getActiveChallengePrompt(),
    });
  };

  const startCamera = async (nextFacingMode = facingMode) => {
    const mode = nextFacingMode === 'user' ? 'user' : 'environment';

    setCameraError('');
    setGpsError('');
    setVideoReady(false);
    setFacingMode(mode);
    setStatus('camera-loading');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera could not be opened. Please check browser camera permission and try again.');
      setStatus('camera-error');
      return;
    }

    try {
      stopCamera();
      let stream;

      try {
        stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints(mode, true));
      } catch (constraintError) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints(mode));
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        }
      }

      setCameraStream(stream);
      setStatus('camera');
    } catch (error) {
      console.error('Camera permission error:', error);
      setCameraError('Camera could not be opened. Please check browser camera permission and try again.');
      setStatus('camera-error');
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setCameraError('Camera preview is not ready yet. Please try again.');
      return;
    }

    if (video.readyState < 2 && !video.videoWidth && !video.videoHeight) {
      setCameraError('Camera preview is still loading. Please wait until the photo appears before taking it.');
      setVideoReady(false);
      return;
    }

    const trackSettings = cameraStream?.getVideoTracks?.()[0]?.getSettings?.() || {};
    const width = video.videoWidth || trackSettings.width || 1280;
    const height = video.videoHeight || trackSettings.height || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    try {
      context.drawImage(video, 0, 0, width, height);
    } catch {
      setCameraError('Camera frame is not visible yet. Please wait a moment or switch cameras.');
      setVideoReady(false);
      return;
    }

    setStatus('capturing');
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Could not capture the camera frame. Please retake the photo.');
        setStatus('camera');
        setVideoReady(true);
        return;
      }

      const file = new File([blob], `live-evidence-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      const previewUrl = URL.createObjectURL(file);

      stopCamera();
      requestGPS(file, previewUrl, {
        useConfirmedLocation: false,
        usedLiveCamera: true,
        challengePrompt: getActiveChallengePrompt(),
      });
    }, 'image/jpeg', 0.92);
  };

  const handleCaptureAdditional = () => {
    if ((evidence?.captures?.length || 0) >= MAX_CAPTURE_COUNT) return;
    if (isLikelyMobile) {
      openNativeCapture(phoneCameraInputRef, 'environment');
      return;
    }
    lastNativeInputRef.current = null;
    startCamera(facingMode);
  };

  const handleLandmarkChange = (value) => {
    setLandmark(value);

    if (!evidence) return;

    const updatedEvidence = {
      ...evidence,
      landmark: value,
      geoTag: evidence.geoTag ? { ...evidence.geoTag, landmark: value } : evidence.geoTag
    };
    setEvidence(updatedEvidence);
    onEvidenceChange?.(updatedEvidence);

    if (evidence.geoTag || confirmedLocation) {
      onLocationCaptured?.({
        ...(confirmedLocation || evidence.geoTag || {}),
        landmark: value,
        confirmedByUser: confirmedLocation?.confirmedByUser ?? false,
      });
    }
  };

  const handleRetake = () => {
    const nativeInputRef = lastNativeInputRef.current;
    (evidence?.captures || [{ previewUrl: evidence?.previewUrl }]).forEach((capture) => {
      if (capture?.previewUrl) URL.revokeObjectURL(capture.previewUrl);
    });
    setEvidence(null);
    setLandmark('');
    setGpsError('');
    onEvidenceChange?.(null);
    selectChallengePrompt();
    if (nativeInputRef) {
      setStatus('idle');
      openNativeCapture(nativeInputRef, 'environment');
      return;
    }
    startCamera(facingMode);
  };

  const handleRemove = () => {
    (evidence?.captures || [{ previewUrl: evidence?.previewUrl }]).forEach((capture) => {
      if (capture?.previewUrl) URL.revokeObjectURL(capture.previewUrl);
    });
    stopCamera();
    setEvidence(null);
    setLandmark('');
    setGpsError('');
    setCameraError('');
    setVideoReady(false);
    setStatus('idle');
    onEvidenceChange?.(null);
    selectChallengePrompt();
  };

  const handleUse = () => {
    if (!evidence) return;
    const updatedEvidence = {
      ...evidence,
      landmark,
      geoTag: evidence.geoTag ? { ...evidence.geoTag, landmark } : evidence.geoTag
    };
    setEvidence(updatedEvidence);
    onEvidenceChange?.(updatedEvidence);
    if (evidence.geoTag || confirmedLocation) {
      onLocationCaptured?.({
        ...(confirmedLocation || evidence.geoTag || {}),
        landmark,
        confirmedByUser: confirmedLocation?.confirmedByUser ?? false,
      });
    }
  };

  const handleRefreshEvidenceGps = () => {
    if (!evidence?.file || !evidence?.previewUrl) return;
    requestGPS(evidence.file, evidence.previewUrl, { refreshExisting: true });
  };

  const evidenceUsesConfirmedLocation = Boolean(evidence?.geoTag?.usedConfirmedComplaintLocation);
  const evidenceGpsRefreshedSeparately = Boolean(evidence?.geoTag?.evidenceGpsRefreshed && !evidenceUsesConfirmedLocation);
  const showAccuracyWarning = evidence?.geoTag?.accuracy != null && evidence.geoTag.accuracy > 100;
  const evidenceAccuracyStatus = getAccuracyStatus(evidence?.geoTag?.accuracy);
  const complaintAccuracyStatus = getAccuracyStatus(confirmedLocation?.accuracy);
  const captureCount = evidence?.captures?.length || 0;
  const captureProgressLabel = `Photo ${Math.min(captureCount + 1, REQUIRED_CAPTURE_COUNT)} of ${REQUIRED_CAPTURE_COUNT}`;
  const nextCaptureLabel = captureCount < REQUIRED_CAPTURE_COUNT ? 'Capture Challenge Photo' : 'Capture Wider Scene';
  const canAddMoreCaptures = captureCount > 0 && captureCount < MAX_CAPTURE_COUNT;
  const requiresManualReview = evidence?.authenticity?.status === 'Needs Manual Verification'
    || evidence?.authenticity?.status === 'Suspicious Evidence'
    || evidence?.authenticity?.screenSpoofRisk === 'High'
    || evidence?.authenticity?.screenSpoofRisk === 'Medium';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={phoneCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileCapture}
        style={{ display: 'none' }}
      />
      {showHttpsWarning && (
        <div style={httpsWarningStyle}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <span>Camera and location may not work unless the site is opened over HTTPS.</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={nativeCapturePanelStyle}>
            <div style={nativeCaptureButtonRowStyle}>
              <button
                type="button"
                id="liveGeoCameraBtn"
                className="btn btn-primary btn-sm"
                onClick={handlePrimaryCameraClick}
                disabled={!isLikelyMobile && !canUseLivePreview}
                style={{ ...nativeCaptureButtonStyle, opacity: !isLikelyMobile && !canUseLivePreview ? 0.55 : 1 }}
              >
                <Camera size={14} />
                Camera
              </button>
            </div>
            <p style={mobileCaptureHelperStyle}>
              On mobile, camera opens through your browser. On laptop, a live camera preview opens. Please allow camera and location permission.
            </p>
            <div style={challengeBoxStyle}>
              <p style={challengeEyebrowStyle}>Live Evidence Authenticity Check</p>
              <p style={challengePromptStyle}>{challengePrompt}</p>
              <p style={challengeTextStyle}>
                CivicTrust does not claim 100% fake image detection. It flags suspicious evidence using live challenge, GPS, timestamp, multi-frame comparison and screen replay risk signals.
              </p>
            </div>
            {cameraError && (
              <div style={idleCameraErrorStyle}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span>{cameraError}</span>
              </div>
            )}
          </motion.div>
        )}

        {status === 'camera-loading' && (
          <motion.div key="camera-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={loadingBoxStyle}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <p style={loadingTitleStyle}>Opening camera...</p>
              <p style={loadingTextStyle}>{captureCount > 0 ? nextCaptureLabel : captureProgressLabel}: {challengePrompt}</p>
            </div>
          </motion.div>
        )}

        {status === 'camera' && (
          <motion.div key="camera" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={cameraCardStyle}>
            <div style={{ position: 'relative', background: '#0f172a', aspectRatio: '4 / 3' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={markVideoReady}
                onCanPlay={markVideoReady}
                onPlaying={markVideoReady}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {!videoReady && (
                <div style={cameraPendingOverlayStyle}>
                  <Loader2 size={22} className="animate-spin" />
                  <span>Starting camera preview...</span>
                </div>
              )}
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                left: '0.75rem',
                zIndex: 3,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(15,23,42,0.72)',
                color: 'white',
                fontSize: '0.6875rem',
                fontWeight: 800,
                letterSpacing: '0.05em'
              }}>
                <Video size={13} />
                LIVE CAMERA
              </div>
              <button
                type="button"
                title="Flip camera"
                onClick={handleFlipCamera}
                style={cameraFlipButtonStyle}
              >
                <RefreshCw size={13} />
                Flip
              </button>
              <div style={cameraChallengeOverlayStyle}>
                <span>{captureCount > 0 ? nextCaptureLabel : captureProgressLabel}</span>
                <strong>{challengePrompt}</strong>
              </div>
            </div>

            {cameraError && (
              <div style={inlineCameraErrorStyle}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span>{cameraError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={captureFrame} disabled={!videoReady} style={{ flex: 1, opacity: videoReady ? 1 : 0.62 }}>
                <Camera size={15} />
                Take Photo
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { stopCamera(); setCameraError(''); setStatus('idle'); }}>
                <X size={15} />
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {status === 'camera-error' && (
          <motion.div key="camera-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={errorBoxStyle}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <p style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Camera unavailable</p>
              <p>{cameraError}</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => startCamera(facingMode)} style={{ marginTop: '0.75rem' }}>
                <RefreshCw size={14} />
                Try Camera Again
              </button>
            </div>
          </motion.div>
        )}

        {(status === 'capturing' || status === 'gps') && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={loadingBoxStyle}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <p style={loadingTitleStyle}>{status === 'capturing' ? 'Capturing live photo...' : 'Acquiring GPS coordinates...'}</p>
              <p style={loadingTextStyle}>{status === 'gps' ? 'Please allow location access when prompted.' : 'Converting camera frame into evidence.'}</p>
            </div>
          </motion.div>
        )}

        {(status === 'preview' || status === 'gps-denied') && evidence && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={previewCardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 0 }}>
              <div style={{ position: 'relative', minHeight: '180px' }}>
                <img src={evidence.previewUrl} alt="Live captured evidence" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  left: '0.5rem',
                  background: status === 'preview' ? 'rgba(20,184,166,0.92)' : 'rgba(239,68,68,0.92)',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  letterSpacing: '0.05em'
                }}>
                  {evidenceUsesConfirmedLocation ? 'CONFIRMED GPS' : status === 'preview' ? 'LIVE GPS' : 'LIVE PHOTO'}
                </div>
              </div>

              <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {evidence.geoTag ? (
                  <>
                    {evidenceUsesConfirmedLocation && (
                      <div style={confirmedBadgeStyle}>
                        <CheckCircle size={12} />
                        <span>Using confirmed complaint location</span>
                      </div>
                    )}
                    {evidenceGpsRefreshedSeparately && (
                      <div style={separateGpsBadgeStyle}>
                        <Navigation size={12} />
                        <span>Evidence GPS refreshed separately</span>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', fontSize: '0.75rem' }}>
                      <MetaBox label="Latitude" value={formatCoord(evidence.geoTag.lat)} />
                      <MetaBox label="Longitude" value={formatCoord(evidence.geoTag.lng)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: evidenceGpsRefreshedSeparately ? '1fr' : '1fr 1fr', gap: '0.375rem', fontSize: '0.6875rem' }}>
                      {evidenceGpsRefreshedSeparately && hasConfirmedLocation ? (
                        <div style={{ color: 'var(--on-surface-variant)', lineHeight: 1.55 }}>
                          <p>
                            Complaint Location Accuracy: <strong style={{ color: complaintAccuracyStatus.tone }}>{formatAccuracy(confirmedLocation?.accuracy)}</strong>
                          </p>
                          <p>
                            Evidence Capture Accuracy: <strong style={{ color: evidenceAccuracyStatus.tone }}>{formatAccuracy(evidence.geoTag.accuracy)}</strong>
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--on-surface-variant)' }}>
                          <Navigation size={11} />
                          <span>
                            Accuracy: <strong style={{ color: evidenceAccuracyStatus.tone }}>
                              {formatAccuracy(evidence.geoTag.accuracy)}
                            </strong>
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {formatDate(evidence.geoTag.capturedAt)}
                      </div>
                    </div>
                    {evidence.geoTag.address && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
                        <strong style={{ color: 'var(--on-surface)' }}>Address:</strong> {evidence.geoTag.address}
                      </p>
                    )}
                  </>
                ) : (
                  <div style={gpsMissingStyle}>
                    <p style={{ fontWeight: 700, marginBottom: '0.125rem' }}>No GPS coordinates</p>
                    <p style={{ opacity: 0.85 }}>Please add an exact landmark below.</p>
                  </div>
                )}
              </div>
            </div>

            {evidence.captures?.length > 0 && (
              <div style={captureStripStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Photo {evidence.captures.length} of {REQUIRED_CAPTURE_COUNT}
                  </p>
                  {!evidence.challengeCompleted && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9a5f00' }}>Challenge photo required for verified evidence</span>
                  )}
                </div>
                <div style={captureThumbGridStyle}>
                  {evidence.captures.map((capture, index) => (
                    <div key={`${capture.previewUrl}-${index}`} style={captureThumbStyle}>
                      <img src={capture.previewUrl} alt={capture.label || `Evidence ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={captureThumbLabelStyle}>{index + 1}. {capture.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AuthenticityCard authenticity={evidence.authenticity} />
            <ScreenSpoofRiskCard
              authenticity={evidence.authenticity}
              onRetake={handleRetake}
              onCaptureWiderScene={handleCaptureAdditional}
              onContinue={handleUse}
              canCaptureWiderScene={canAddMoreCaptures}
            />

            {showAccuracyWarning && (
              <div style={warningBoxStyle}>
                <AlertCircle size={13} color="#ef9900" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span>GPS accuracy is moderate/low. Please confirm landmark.</span>
              </div>
            )}

            {gpsError && (
              <div style={gpsErrorStyle}>
                <AlertCircle size={13} color="#dc2626" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                <span>{gpsError}</span>
              </div>
            )}

            <div style={{ padding: '0.75rem 0.875rem', borderTop: '1px solid rgba(20,184,166,0.12)' }}>
              <label htmlFor="liveEvidenceLandmark" style={labelStyle}>
                Exact Landmark / Place {!evidence.geoTag && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                id="liveEvidenceLandmark"
                className="form-input"
                type="text"
                value={landmark}
                onChange={(event) => handleLandmarkChange(event.target.value)}
                placeholder="Example: Bansal College Main Gate"
                style={{ fontSize: '0.875rem', marginBottom: '0' }}
              />
            </div>

            <div style={actionBarStyle}>
              {canAddMoreCaptures && (
                <button type="button" id="liveEvidenceAddFrameBtn" onClick={handleCaptureAdditional} className="btn btn-sm btn-secondary">
                  <Camera size={13} />
                  {nextCaptureLabel}
                </button>
              )}
              <button type="button" id="liveEvidenceRetakeBtn" onClick={handleRetake} className="btn btn-sm btn-outline">
                <RefreshCw size={13} />
                Retake Evidence
              </button>
              <button type="button" id="liveEvidenceRefreshGpsBtn" onClick={handleRefreshEvidenceGps} className="btn btn-sm btn-outline">
                <Navigation size={13} />
                Refresh GPS for Evidence
              </button>
              <button type="button" id="liveEvidenceUseBtn" onClick={handleUse} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                <CheckCircle size={13} />
                {requiresManualReview ? 'Continue with Manual Review' : 'Use This Evidence'}
              </button>
              <button type="button" id="liveEvidenceRemoveBtn" onClick={handleRemove} className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }}>
                <Trash2 size={13} />
                Remove Evidence
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={privacyBoxStyle}>
        <Shield size={13} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.1rem' }} />
        <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          Your location is attached only to verify complaint evidence and route it to the correct authority.
        </p>
      </div>
    </div>
  );
}

function MetaBox({ label, value }) {
  return (
    <div style={{
      padding: '0.375rem 0.5rem',
      background: 'var(--surface-container-lowest)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(20,184,166,0.15)'
    }}>
      <p style={{ color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: '0.125rem', fontSize: '0.625rem', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontFamily: 'monospace', fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function AuthenticityCard({ authenticity }) {
  if (!authenticity) return null;
  const tone = getAuthenticityTone(authenticity.status);

  return (
    <div style={authenticityCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence Authenticity Score</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: tone.color, lineHeight: 1.15 }}>{authenticity.score}%</p>
        </div>
        <span style={{ ...authenticityStatusStyle, color: tone.color, background: tone.background, borderColor: tone.border }}>
          {authenticity.status}
        </span>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
        <div>
          <p style={authenticityListTitleStyle}>Signals</p>
          <div style={authenticityListStyle}>
            {(authenticity.signals || []).map((signal) => (
              <span key={signal} style={authenticitySignalStyle}>
                <CheckCircle size={12} />
                {signal}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p style={authenticityListTitleStyle}>Warnings</p>
          <div style={authenticityListStyle}>
            {(authenticity.warnings || []).map((warning) => (
              <span key={warning} style={authenticityWarningStyle}>
                <AlertCircle size={12} />
                {warning}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
        AI visual relevance check can verify whether evidence matches complaint category. It is currently pending and should be treated as officer review support, not a guarantee.
      </p>
    </div>
  );
}

function ScreenSpoofRiskCard({
  authenticity,
  onRetake,
  onCaptureWiderScene,
  onContinue,
  canCaptureWiderScene,
}) {
  if (!authenticity?.screenSpoofRisk) return null;

  const tone = getSpoofRiskTone(authenticity.screenSpoofRisk);
  const isHighRisk = authenticity.screenSpoofRisk === 'High';
  const signals = authenticity.spoofSignals?.length ? authenticity.spoofSignals : [];
  const warnings = authenticity.spoofWarnings?.length ? authenticity.spoofWarnings : [];

  return (
    <div style={{ ...screenSpoofCardStyle, borderColor: tone.border, background: tone.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 900, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Screen Spoof Risk</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', lineHeight: 1.45 }}>
            Checks live challenge, GPS, timestamp, multi-frame similarity, and screen replay risk signals.
          </p>
        </div>
        <span style={{ ...screenRiskBadgeStyle, color: tone.color, borderColor: tone.border, background: tone.badgeBackground }}>
          {authenticity.screenSpoofRisk} Risk
        </span>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
        <div>
          <p style={authenticityListTitleStyle}>Risk Signals</p>
          <div style={authenticityListStyle}>
            {(signals.length ? signals : ['No screen replay signal detected']).map((signal) => (
              <span key={signal} style={{ ...authenticitySignalStyle, color: tone.color }}>
                <CheckCircle size={12} />
                {formatSpoofSignal(signal)}
              </span>
            ))}
          </div>
        </div>
        {warnings.length > 0 && (
          <div>
            <p style={authenticityListTitleStyle}>Warnings</p>
            <div style={authenticityListStyle}>
              {warnings.map((warning) => (
                <span key={warning} style={authenticityWarningStyle}>
                  <AlertCircle size={12} />
                  {warning}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isHighRisk && (
        <>
          <div style={screenSpoofHighWarningStyle}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>Possible phone-screen/photo replay detected. Please capture the real scene again with surrounding landmark.</span>
          </div>
          <div style={screenRiskActionRowStyle}>
            <button type="button" className="btn btn-sm btn-outline" onClick={onRetake}>
              <RefreshCw size={13} />
              Retake Evidence
            </button>
            {canCaptureWiderScene && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={onCaptureWiderScene}>
                <Camera size={13} />
                Capture Wider Scene
              </button>
            )}
            <button type="button" className="btn btn-sm btn-primary" onClick={onContinue}>
              <CheckCircle size={13} />
              Continue with Manual Review
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const loadingBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem 1.25rem',
  background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(30,58,138,0.08))',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(20,184,166,0.2)'
};

const loadingTitleStyle = {
  fontWeight: 700,
  fontSize: '0.875rem',
  color: 'var(--primary)'
};

const loadingTextStyle = {
  fontSize: '0.75rem',
  color: 'var(--on-surface-variant)'
};

const challengeBoxStyle = {
  padding: '0.75rem',
  background: 'rgba(255,255,255,0.78)',
  border: '1px solid rgba(20,184,166,0.18)',
  borderRadius: 'var(--radius-sm)'
};

const challengeEyebrowStyle = {
  margin: 0,
  fontSize: '0.625rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--primary)'
};

const challengePromptStyle = {
  margin: '0.2rem 0',
  fontSize: '0.875rem',
  fontWeight: 800,
  color: 'var(--on-surface)'
};

const challengeTextStyle = {
  margin: 0,
  fontSize: '0.72rem',
  color: 'var(--on-surface-variant)',
  lineHeight: 1.45
};

const cameraCardStyle = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid rgba(20,184,166,0.25)',
  background: 'linear-gradient(135deg, rgba(20,184,166,0.05), rgba(30,58,138,0.05))',
  overflow: 'hidden'
};

const previewCardStyle = {
  ...cameraCardStyle
};

const nativeCapturePanelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
  padding: '0.875rem',
  background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(30,58,138,0.06))',
  border: '1px solid rgba(20,184,166,0.18)',
  borderRadius: 'var(--radius-md)'
};

const nativeCaptureButtonRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '0.5rem'
};

const nativeCaptureButtonStyle = {
  minHeight: '2.25rem',
  justifyContent: 'center',
  whiteSpace: 'normal',
  lineHeight: 1.2
};

const mobileCaptureHelperStyle = {
  margin: 0,
  fontSize: '0.75rem',
  color: 'var(--on-surface-variant)',
  lineHeight: 1.45
};

const cameraPendingOverlayStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.625rem',
  background: 'rgba(15,23,42,0.78)',
  color: 'white',
  fontSize: '0.8125rem',
  fontWeight: 700,
  pointerEvents: 'none'
};

const cameraFlipButtonStyle = {
  position: 'absolute',
  top: '0.65rem',
  right: '0.65rem',
  zIndex: 4,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  minWidth: '4.25rem',
  height: '1.9rem',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: '999px',
  padding: '0 0.65rem',
  background: 'rgba(15,23,42,0.72)',
  color: 'white',
  fontSize: '0.72rem',
  fontWeight: 800,
  cursor: 'pointer'
};

const cameraChallengeOverlayStyle = {
  position: 'absolute',
  left: '0.75rem',
  right: '0.75rem',
  bottom: '0.75rem',
  zIndex: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  padding: '0.65rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(15,23,42,0.72)',
  color: 'white',
  fontSize: '0.75rem',
  lineHeight: 1.35
};

const captureStripStyle = {
  padding: '0.75rem 0.875rem',
  borderTop: '1px solid rgba(20,184,166,0.12)',
  background: 'rgba(255,255,255,0.55)'
};

const captureThumbGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))',
  gap: '0.625rem'
};

const captureThumbStyle = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(20,184,166,0.18)',
  background: 'var(--surface-container-lowest)',
  aspectRatio: '4 / 3'
};

const captureThumbLabelStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '0.3rem 0.45rem',
  background: 'rgba(15,23,42,0.68)',
  color: 'white',
  fontSize: '0.62rem',
  fontWeight: 800
};

const authenticityCardStyle = {
  margin: '0.75rem 0.875rem 0',
  padding: '0.875rem',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(240,253,250,0.72))',
  border: '1px solid rgba(20,184,166,0.18)',
  borderRadius: 'var(--radius-md)'
};

const screenSpoofCardStyle = {
  margin: '0.75rem 0.875rem 0',
  padding: '0.875rem',
  border: '1px solid',
  borderRadius: 'var(--radius-md)'
};

const getAuthenticityTone = (status) => {
  if (status === 'Verified Live Evidence') {
    return { color: '#15803d', background: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.24)' };
  }
  if (status === 'Suspicious Evidence') {
    return { color: '#b91c1c', background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)' };
  }
  return { color: '#b45309', background: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.28)' };
};

const getSpoofRiskTone = (risk) => {
  if (risk === 'High') {
    return { color: '#b91c1c', background: 'rgba(239,68,68,0.08)', badgeBackground: 'rgba(239,68,68,0.13)', border: 'rgba(239,68,68,0.28)' };
  }
  if (risk === 'Medium') {
    return { color: '#b45309', background: 'rgba(245,158,11,0.08)', badgeBackground: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.28)' };
  }
  return { color: '#15803d', background: 'rgba(34,197,94,0.08)', badgeBackground: 'rgba(34,197,94,0.13)', border: 'rgba(34,197,94,0.24)' };
};

const formatSpoofSignal = (signal) => {
  const labels = {
    possibleScreenReflection: 'Possible screen reflection',
    possibleMoirePattern: 'Possible moire or display pattern',
    possibleFlatImageReplay: 'Possible flat image replay',
    challengeNotCompleted: 'Challenge not completed',
    singleFrameOnly: 'Single frame only',
    lowContextCapture: 'Low context capture',
    possibleDuplicateFrame: 'Possible duplicate frame',
    gpsMissing: 'GPS metadata missing',
    gpsAccuracyLow: 'GPS accuracy low or moderate',
    similarFrames: 'Captured frames appear similar',
    possibleScreenGlare: 'Possible screen glare',
    canvasAnalysisUnavailable: 'Canvas analysis unavailable',
    'No screen replay signal detected': 'No screen replay signal detected',
  };
  return labels[signal] || String(signal).replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
};

const authenticityStatusStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.3rem 0.55rem',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '0.68rem',
  fontWeight: 900
};

const authenticityListTitleStyle = {
  margin: '0 0 0.35rem',
  fontSize: '0.66rem',
  fontWeight: 900,
  color: 'var(--on-surface-variant)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const authenticityListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem'
};

const authenticitySignalStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.35rem',
  fontSize: '0.72rem',
  color: '#0f766e',
  lineHeight: 1.35
};

const authenticityWarningStyle = {
  ...authenticitySignalStyle,
  color: '#9a5f00'
};

const screenRiskBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.3rem 0.55rem',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '0.68rem',
  fontWeight: 900
};

const screenSpoofHighWarningStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.45rem',
  marginTop: '0.75rem',
  padding: '0.625rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(239,68,68,0.08)',
  color: '#b91c1c',
  fontSize: '0.75rem',
  lineHeight: 1.45
};

const screenRiskActionRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.75rem'
};

const inlineCameraErrorStyle = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  padding: '0.625rem 0.875rem',
  background: 'rgba(239,68,68,0.07)',
  color: '#b91c1c',
  borderTop: '1px solid rgba(239,68,68,0.18)',
  fontSize: '0.75rem',
  lineHeight: 1.4
};

const errorBoxStyle = {
  display: 'flex',
  gap: '0.625rem',
  padding: '0.875rem 1rem',
  background: 'rgba(239,68,68,0.06)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 'var(--radius-md)',
  color: '#b91c1c',
  fontSize: '0.8125rem',
  lineHeight: 1.45
};

const idleCameraErrorStyle = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  padding: '0.625rem 0.75rem',
  background: 'rgba(239,68,68,0.06)',
  border: '1px solid rgba(239,68,68,0.18)',
  borderRadius: 'var(--radius-sm)',
  color: '#b91c1c',
  fontSize: '0.75rem',
  lineHeight: 1.4
};

const httpsWarningStyle = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  padding: '0.625rem 0.75rem',
  background: 'rgba(239,153,0,0.08)',
  border: '1px solid rgba(239,153,0,0.2)',
  borderRadius: 'var(--radius-sm)',
  color: '#9a5f00',
  fontSize: '0.75rem',
  lineHeight: 1.4
};

const gpsMissingStyle = {
  padding: '0.5rem',
  background: 'rgba(239,68,68,0.06)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.75rem',
  color: '#dc2626'
};

const warningBoxStyle = {
  padding: '0.5rem 0.875rem',
  background: 'rgba(239,153,0,0.08)',
  borderTop: '1px solid rgba(239,153,0,0.2)',
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-start',
  fontSize: '0.75rem',
  color: '#9a5f00',
  lineHeight: 1.4
};

const confirmedBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  width: 'fit-content',
  padding: '0.25rem 0.5rem',
  borderRadius: '999px',
  background: 'rgba(20,184,166,0.12)',
  color: '#0f766e',
  fontSize: '0.6875rem',
  fontWeight: 800
};

const separateGpsBadgeStyle = {
  ...confirmedBadgeStyle,
  background: 'rgba(239,153,0,0.12)',
  color: '#9a5f00'
};

const gpsErrorStyle = {
  ...warningBoxStyle,
  background: 'rgba(239,68,68,0.06)',
  borderTop: '1px solid rgba(239,68,68,0.15)',
  color: '#b91c1c'
};

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--on-surface-variant)',
  display: 'block',
  marginBottom: '0.375rem'
};

const actionBarStyle = {
  display: 'flex',
  gap: '0.5rem',
  padding: '0.75rem 0.875rem',
  borderTop: '1px solid rgba(20,184,166,0.12)',
  background: 'rgba(0,0,0,0.02)',
  flexWrap: 'wrap'
};

const privacyBoxStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
  padding: '0.625rem 0.75rem',
  background: 'rgba(30,58,138,0.04)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid rgba(30,58,138,0.1)'
};
