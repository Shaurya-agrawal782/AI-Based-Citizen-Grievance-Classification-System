import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Camera, CheckCircle, Loader2, Navigation, RefreshCw, Shield, Trash2, Video, X } from 'lucide-react';
import { reverseGeocode } from '../../utils/locationHelper';

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0
};

const getCameraConstraints = (mode, exact = false) => ({
  audio: false,
  video: {
    facingMode: exact ? { exact: mode } : { ideal: mode },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});

export default function LiveGeoTaggedCapture({ onEvidenceChange, onStatusChange, authoritativeLocation }) {
  const [status, setStatus] = useState('idle');
  const [evidence, setEvidence] = useState(null);
  const [landmark, setLandmark] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  const mergeAuthoritativeLocation = useCallback((nextEvidence) => {
    if (!nextEvidence || !authoritativeLocation) return nextEvidence;

    const authoritativeLat = authoritativeLocation.lat ?? authoritativeLocation.coordinates?.lat ?? null;
    const authoritativeLng = authoritativeLocation.lng ?? authoritativeLocation.coordinates?.lng ?? null;
    const hasAuthoritativeCoords = Number.isFinite(Number(authoritativeLat)) && Number.isFinite(Number(authoritativeLng));
    const authoritativeAddress = (
      authoritativeLocation.finalAddress
      || authoritativeLocation.address
      || authoritativeLocation.displayAddress
      || ''
    ).trim();
    const authoritativeLandmark = (authoritativeLocation.landmark || '').trim();

    if (!hasAuthoritativeCoords && !authoritativeAddress && !authoritativeLandmark) return nextEvidence;

    const rawGeoTag = nextEvidence.geoTag || null;
    const rawCaptureGeoTag = rawGeoTag?.rawCaptureGeoTag || rawGeoTag;
    const mergedGeoTag = {
      ...(rawGeoTag || {}),
      lat: hasAuthoritativeCoords ? Number(authoritativeLat) : rawGeoTag?.lat ?? null,
      lng: hasAuthoritativeCoords ? Number(authoritativeLng) : rawGeoTag?.lng ?? null,
      accuracy: authoritativeLocation.accuracy ?? rawGeoTag?.accuracy ?? null,
      capturedAt: rawGeoTag?.capturedAt || new Date().toISOString(),
      source: authoritativeLocation.source || rawGeoTag?.source || 'GPS',
      address: authoritativeAddress || rawGeoTag?.address || '',
      landmark: nextEvidence.landmark || authoritativeLandmark || rawGeoTag?.landmark || '',
      confirmedFromComplaintLocation: true,
      rawCaptureGeoTag: rawCaptureGeoTag
        ? {
            lat: rawCaptureGeoTag.lat ?? null,
            lng: rawCaptureGeoTag.lng ?? null,
            accuracy: rawCaptureGeoTag.accuracy ?? null,
            address: rawCaptureGeoTag.address || '',
            source: rawCaptureGeoTag.source || 'GPS',
          }
        : null,
    };

    return {
      ...nextEvidence,
      landmark: nextEvidence.landmark || authoritativeLandmark,
      geoTag: mergedGeoTag,
    };
  }, [authoritativeLocation]);

  useEffect(() => {
    if (!evidence || !authoritativeLocation) return;

    const updatedEvidence = mergeAuthoritativeLocation(evidence);
    const currentGeoTag = evidence.geoTag || {};
    const updatedGeoTag = updatedEvidence?.geoTag || {};
    const changed = (
      currentGeoTag.lat !== updatedGeoTag.lat
      || currentGeoTag.lng !== updatedGeoTag.lng
      || currentGeoTag.accuracy !== updatedGeoTag.accuracy
      || currentGeoTag.address !== updatedGeoTag.address
      || currentGeoTag.landmark !== updatedGeoTag.landmark
      || evidence.landmark !== updatedEvidence?.landmark
    );

    if (!changed) return;

    if (!landmark && updatedEvidence?.landmark) {
      setLandmark(updatedEvidence.landmark);
    }
    setEvidence(updatedEvidence);
    onEvidenceChange?.(updatedEvidence);
  }, [authoritativeLocation, evidence, landmark, mergeAuthoritativeLocation, onEvidenceChange]);

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

  const publishEvidence = (nextEvidence, nextStatus = 'preview') => {
    const evidenceWithConfirmedLocation = mergeAuthoritativeLocation(nextEvidence);
    if (!landmark && evidenceWithConfirmedLocation?.landmark) {
      setLandmark(evidenceWithConfirmedLocation.landmark);
    }
    setEvidence(evidenceWithConfirmedLocation);
    setStatus(nextStatus);
    onEvidenceChange?.(evidenceWithConfirmedLocation);
  };

  const requestGPS = async (file, previewUrl) => {
    setStatus('gps');
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Photo captured, but GPS is not supported by this browser. Please enter the exact landmark.');
      publishEvidence({ file, previewUrl, geoTag: null, landmark: '' }, 'gps-denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const capturedAt = new Date().toISOString();
        let address = '';

        try {
          const geocoded = await reverseGeocode(latitude, longitude);
          address = geocoded?.address || '';
        } catch {
          address = '';
        }

        publishEvidence({
          file,
          previewUrl,
          landmark: '',
          geoTag: {
            lat: latitude,
            lng: longitude,
            accuracy,
            capturedAt,
            source: 'GPS',
            address
          }
        });
      },
      (error) => {
        const deniedMessage = 'Photo captured, but GPS permission was denied. Please allow location or enter location manually.';
        const timeoutMessage = 'Photo captured, but GPS timed out. Please retry location or enter the exact landmark.';
        setGpsError(error.code === error.TIMEOUT ? timeoutMessage : deniedMessage);
        publishEvidence({ file, previewUrl, geoTag: null, landmark: '' }, 'gps-denied');
      },
      GPS_OPTIONS
    );
  };

  const startCamera = async (nextFacingMode = facingMode) => {
    const mode = nextFacingMode === 'user' ? 'user' : 'environment';

    setCameraError('');
    setGpsError('');
    setVideoReady(false);
    setFacingMode(mode);
    setStatus('camera-loading');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera capture is not supported in this browser. Please use a mobile browser or the regular evidence upload below.');
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
      setCameraError('Camera permission was denied or no camera was found. Please allow camera access and try again.');
      setStatus('camera-error');
    }
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
      requestGPS(file, previewUrl);
    }, 'image/jpeg', 0.92);
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
  };

  const handleRetake = () => {
    if (evidence?.previewUrl) URL.revokeObjectURL(evidence.previewUrl);
    setEvidence(null);
    setLandmark('');
    setGpsError('');
    onEvidenceChange?.(null);
    startCamera(facingMode);
  };

  const handleRemove = () => {
    if (evidence?.previewUrl) URL.revokeObjectURL(evidence.previewUrl);
    stopCamera();
    setEvidence(null);
    setLandmark('');
    setGpsError('');
    setCameraError('');
    setVideoReady(false);
    setStatus('idle');
    onEvidenceChange?.(null);
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
  };

  const handleCameraModeChange = (mode) => {
    if (mode === facingMode && status === 'camera') return;
    startCamera(mode);
  };

  const showAccuracyWarning = evidence?.geoTag?.accuracy != null && evidence.geoTag.accuracy > 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              id="liveGeoCaptureBtn"
              onClick={() => startCamera(facingMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                width: '100%',
                padding: '0.875rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(30,58,138,0.12))',
                border: '2px dashed rgba(20,184,166,0.45)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                transition: 'all 0.2s'
              }}
            >
              <Camera size={20} />
              Capture Live Geo-Tagged Evidence
            </button>
          </motion.div>
        )}

        {status === 'camera-loading' && (
          <motion.div key="camera-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={loadingBoxStyle}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              <p style={loadingTitleStyle}>Opening camera...</p>
              <p style={loadingTextStyle}>Please allow camera access when prompted.</p>
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
              <div style={cameraModeToggleStyle}>
                <button
                  type="button"
                  aria-pressed={facingMode === 'environment'}
                  title="Use back camera"
                  onClick={() => handleCameraModeChange('environment')}
                  style={cameraModeButtonStyle(facingMode === 'environment')}
                >
                  Back
                </button>
                <button
                  type="button"
                  aria-pressed={facingMode === 'user'}
                  title="Use front camera"
                  onClick={() => handleCameraModeChange('user')}
                  style={cameraModeButtonStyle(facingMode === 'user')}
                >
                  Front
                </button>
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
                  {status === 'preview' ? 'LIVE GPS' : 'LIVE PHOTO'}
                </div>
              </div>

              <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {evidence.geoTag ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', fontSize: '0.75rem' }}>
                      <MetaBox label="Latitude" value={formatCoord(evidence.geoTag.lat)} />
                      <MetaBox label="Longitude" value={formatCoord(evidence.geoTag.lng)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', fontSize: '0.6875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--on-surface-variant)' }}>
                        <Navigation size={11} />
                        <span>
                          Accuracy: <strong style={{ color: evidence.geoTag.accuracy > 100 ? '#ef9900' : '#0d9488' }}>
                            {evidence.geoTag.accuracy != null ? `${Math.round(evidence.geoTag.accuracy)} m` : 'N/A'}
                          </strong>
                        </span>
                      </div>
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
              <button type="button" id="liveEvidenceRetakeBtn" onClick={handleRetake} className="btn btn-sm btn-outline">
                <RefreshCw size={13} />
                Retake Photo
              </button>
              <button type="button" id="liveEvidenceUseBtn" onClick={handleUse} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
                <CheckCircle size={13} />
                Use This Evidence
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

const cameraCardStyle = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid rgba(20,184,166,0.25)',
  background: 'linear-gradient(135deg, rgba(20,184,166,0.05), rgba(30,58,138,0.05))',
  overflow: 'hidden'
};

const previewCardStyle = {
  ...cameraCardStyle
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

const cameraModeToggleStyle = {
  position: 'absolute',
  top: '0.65rem',
  right: '0.65rem',
  zIndex: 3,
  display: 'inline-flex',
  gap: '0.25rem',
  padding: '0.25rem',
  borderRadius: '999px',
  background: 'rgba(15,23,42,0.72)',
  border: '1px solid rgba(255,255,255,0.18)'
};

const cameraModeButtonStyle = (isActive) => ({
  minWidth: '3.25rem',
  height: '1.75rem',
  border: 0,
  borderRadius: '999px',
  padding: '0 0.65rem',
  background: isActive ? 'white' : 'transparent',
  color: isActive ? '#0f172a' : 'rgba(255,255,255,0.82)',
  fontSize: '0.72rem',
  fontWeight: 800,
  cursor: 'pointer'
});

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
