import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, Globe, MessageSquare, ArrowLeft, Mail, ExternalLink, Image as ImageIcon, MapPin, ShieldCheck } from 'lucide-react';
import { grievanceAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AIDecisionCard from '../components/admin/AIDecisionCard';
import AuditTrailCard from '../components/admin/AuditTrailCard';
import CaseHistoryTimeline from '../components/common/CaseHistoryTimeline';
import OfficerCopilot from '../components/admin/OfficerCopilot';
import WorkloadBalancerCard from '../components/admin/WorkloadBalancerCard';

const statusLabels = {
  'submitted': 'Submitted', 'in-review': 'In Review', 'in-progress': 'In Progress',
  'resolved': 'Resolved', 'escalated': 'Escalated', 'reopened': 'Reopened', 'closed': 'Closed',
};

const getLocationCoordinates = (location) => {
  const lat = location?.lat ?? location?.coordinates?.lat;
  const lng = location?.lng ?? location?.coordinates?.lng;
  return {
    lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
  };
};

const formatLocationCoordinate = (value) => Number(value).toFixed(6);

const API_ORIGIN = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const resolveEvidenceImageUrl = (item) => {
  const rawUrl = item?.url || item?.secureUrl || item?.path || '';
  if (!rawUrl) return '';

  const normalizedUrl = rawUrl.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalizedUrl)) return normalizedUrl;
  if (normalizedUrl.startsWith('/')) return `${API_ORIGIN}${normalizedUrl}`;
  return `${API_ORIGIN}/${normalizedUrl}`;
};

const isImageEvidence = (item) => {
  const mimetype = item?.mimetype || item?.type || '';
  const url = item?.url || item?.path || item?.originalName || item?.filename || '';
  return mimetype.startsWith('image/') || /\.(avif|gif|jpe?g|png|webp)$/i.test(url);
};

const getEvidenceName = (item, fallback) => item?.originalName || item?.filename || fallback;

function EvidenceImageGrid({ items, emptyText, tone = 'neutral' }) {
  const images = (items || []).filter(item => isImageEvidence(item) && resolveEvidenceImageUrl(item));

  if (images.length === 0) {
    return (
      <div style={{
        minHeight: '8rem',
        border: '1px dashed var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '1rem',
        color: 'var(--on-surface-variant)',
        background: 'var(--surface-container-lowest)'
      }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
      {images.map((item, index) => (
        <a
          key={`${resolveEvidenceImageUrl(item)}-${index}`}
          href={resolveEvidenceImageUrl(item)}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: `1px solid ${tone === 'after' ? 'rgba(14,165,164,0.22)' : 'var(--outline-variant)'}`,
            background: 'var(--surface-container-lowest)'
          }}
        >
          <img
            src={resolveEvidenceImageUrl(item)}
            alt={getEvidenceName(item, tone === 'after' ? 'Resolution proof' : 'Citizen evidence')}
            style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
          />
          <p style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--on-surface-variant)',
            padding: '0.5rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {getEvidenceName(item, tone === 'after' ? 'Resolution proof' : 'Citizen evidence')}
          </p>
        </a>
      ))}
    </div>
  );
}

const hasEvidenceCoordinates = (geoTag) => (
  Number.isFinite(Number(geoTag?.lat)) && Number.isFinite(Number(geoTag?.lng))
);

const formatEvidenceCoordinate = (value) => (
  Number.isFinite(Number(value)) ? Number(value).toFixed(6) : 'Not captured'
);

const formatEvidenceAccuracy = (value) => (
  Number.isFinite(Number(value)) ? `${Math.round(Number(value))} m` : 'Not captured'
);

const formatEvidenceDate = (date) => {
  if (!date) return 'Not captured';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function EvidenceMeta({ label, value }) {
  return (
    <div style={{
      padding: '0.75rem',
      background: 'var(--surface-container-lowest)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(197,197,211,0.25)',
      minWidth: 0
    }}>
      <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ fontSize: '0.8125rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</p>
    </div>
  );
}

function GeoTaggedEvidencePanel({ evidenceImages = [] }) {
  if (!evidenceImages.length) return null;

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} color="var(--primary)" />
          Geo-Tagged Evidence
        </h3>
        <span className="badge badge-ai">{evidenceImages.length} item{evidenceImages.length === 1 ? '' : 's'}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {evidenceImages.map((evidence, index) => {
          const geoTag = evidence.geoTag || {};
          const imageUrl = resolveEvidenceImageUrl(evidence);
          const hasMapsLink = hasEvidenceCoordinates(geoTag);
          const mapsUrl = hasMapsLink ? `https://www.google.com/maps?q=${geoTag.lat},${geoTag.lng}` : null;
          const isLive = evidence.evidenceType === 'LIVE_GEO_TAGGED';

          return (
            <div key={evidence.publicId || `${imageUrl}-${index}`} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '1rem',
              padding: '1rem',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(197,197,211,0.2)'
            }}>
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--surface-container-high)',
                aspectRatio: '4 / 3',
                border: '1px solid var(--outline-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isImageEvidence(evidence) && imageUrl ? (
                  <img src={imageUrl} alt={`Evidence ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '1rem' }}>
                    <ImageIcon size={32} style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{getEvidenceName(evidence, 'Evidence file')}</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={isLive ? 'badge badge-resolved' : 'badge badge-ai'}>
                    {isLive ? 'LIVE GEO-TAGGED' : 'UPLOAD'}
                  </span>
                  {evidence.verifiedLiveCapture && (
                    <span className="badge badge-ai" style={{ gap: '0.35rem' }}>
                      <ShieldCheck size={13} />
                      Live capture verified
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  <EvidenceMeta label="Latitude" value={formatEvidenceCoordinate(geoTag.lat)} />
                  <EvidenceMeta label="Longitude" value={formatEvidenceCoordinate(geoTag.lng)} />
                  <EvidenceMeta label="Accuracy" value={formatEvidenceAccuracy(geoTag.accuracy)} />
                  <EvidenceMeta label="Captured Time" value={formatEvidenceDate(geoTag.capturedAt)} />
                </div>

                {(geoTag.landmark || geoTag.address) && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                    {geoTag.landmark && <p><strong style={{ color: 'var(--on-surface)' }}>Landmark:</strong> {geoTag.landmark}</p>}
                    {geoTag.address && <p><strong style={{ color: 'var(--on-surface)' }}>Address:</strong> {geoTag.address}</p>}
                  </div>
                )}

                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
                    <ExternalLink size={15} />
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GrievanceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [note, setNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionFiles, setResolutionFiles] = useState([]);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofMessage, setProofMessage] = useState('');
  const [proofError, setProofError] = useState('');

  useEffect(() => {
    loadGrievance();
  }, [id]);

  const loadGrievance = async () => {
    try {
      const res = await grievanceAPI.getById(id);
      setGrievance(res.data.grievance);
    } catch (err) {
      console.error('Failed to load grievance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status, note) => {
    setUpdating(true);
    try {
      await grievanceAPI.updateStatus(id, { status, note });
      await loadGrievance();
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (department) => {
    setUpdating(true);
    try {
      await grievanceAPI.assign(id, { department });
      await loadGrievance();
    } catch (err) {
      console.error('Assignment failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    try {
      const res = await aiAPI.generateResponse({ grievanceId: id, context: note });
      setAiDraft(res.data.draft);
    } catch (err) {
      console.error('Draft generation failed:', err);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleEscalate = async () => {
    setUpdating(true);
    try {
      await grievanceAPI.escalate(id, { note: 'Manually escalated for urgent review' });
      await loadGrievance();
    } catch (err) {
      console.error('Escalation failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    setUpdating(true);
    try {
      await grievanceAPI.reopen(id, { note: 'Manually reopened for further action' });
      await loadGrievance();
    } catch (err) {
      console.error('Reopen failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleResolutionFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setResolutionFiles(prev => [...prev, ...selectedFiles]);
    event.target.value = '';
  };

  const removeResolutionFile = (index) => {
    setResolutionFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleResolutionProofSubmit = async (event) => {
    event.preventDefault();
    setProofMessage('');
    setProofError('');

    if (!resolutionNote.trim() && resolutionFiles.length === 0) {
      setProofError('Add a resolution note or at least one after-repair image.');
      return;
    }

    const formData = new FormData();
    if (resolutionNote.trim()) formData.append('note', resolutionNote.trim());
    resolutionFiles.forEach(file => formData.append('images', file));

    setProofUploading(true);
    try {
      await grievanceAPI.uploadResolutionProof(id, formData);
      setResolutionNote('');
      setResolutionFiles([]);
      setProofMessage('Resolution proof uploaded for citizen review.');
      await loadGrievance();
    } catch (err) {
      setProofError(err.response?.data?.error || 'Resolution proof upload failed.');
    } finally {
      setProofUploading(false);
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-header"><h2>Official Panel</h2><p>Resolution Authority</p></div>
        </aside>
        <main className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
        </main>
      </div>
    );
  }

  if (!grievance) {
    return (
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-header"><h2>Official Panel</h2><p>Resolution Authority</p></div>
        </aside>
        <main className="admin-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <h2>Grievance not found</h2>
          <Link to="/admin" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
        </main>
      </div>
    );
  }

  const locationCoordinates = getLocationCoordinates(grievance.location);
  const hasLocationDetails = Boolean(
    grievance.location?.landmark ||
    grievance.location?.address ||
    (locationCoordinates.lat !== null && locationCoordinates.lng !== null)
  );

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Official Panel</h2>
          <p>Resolution Authority</p>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin" className="sidebar-link"><span className="material-symbols-outlined">grid_view</span>Overview</Link>
          <Link to="/admin" className="sidebar-link active"><span className="material-symbols-outlined">description</span>Grievance Feed</Link>
          <Link to="/admin/analytics" className="sidebar-link"><span className="material-symbols-outlined">analytics</span>Analytics</Link>
          <Link to="/admin/taxonomy" className="sidebar-link"><span className="material-symbols-outlined">account_tree</span>Taxonomy Studio</Link>
          <a href="#" className="sidebar-link"><span className="material-symbols-outlined">settings</span>Settings</a>
        </nav>
        <div className="sidebar-footer">
          <Link to="/grievance/new" className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add</span>New Grievance
          </Link>
          <a href="#" className="sidebar-link"><span className="material-symbols-outlined">help_outline</span>Support</a>
        </div>
      </aside>

      {/* Detail Content */}
      <main className="admin-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => navigate('/admin')} className="btn btn-ghost btn-sm">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span className={`badge badge-${grievance.status}`}>{statusLabels[grievance.status]}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                    ID: {grievance.trackingId} • Submitted {timeAgo(grievance.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>mail</span>
              Contact Citizen
            </button>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {grievance.title}
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>
            {grievance.category} • {grievance.department}
          </p>

          <AIDecisionCard grievance={grievance} />
          <div style={{ marginBottom: '2rem' }}>
            <OfficerCopilot category={grievance.category} priority={grievance.priority} standalone={true} />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <WorkloadBalancerCard filterDepartment={grievance.category} />
          </div>

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
            {/* Left: Complaint Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Description */}
              <div className="card" style={{ padding: '2rem' }}>
                <p className="form-label" style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>description</span>
                  Citizen Description
                  {grievance.aiClassification?.detectedLanguage && grievance.aiClassification.detectedLanguage.toLowerCase() !== 'english' && (
                    <span className="badge badge-ai" style={{ fontSize: '0.625rem', padding: '2px 6px' }}>Translated from {grievance.aiClassification.detectedLanguage}</span>
                  )}
                </p>
                <div style={{ position: 'relative' }}>
                  <p style={{ fontSize: '1.0625rem', lineHeight: 1.7, color: 'var(--on-surface)' }}>
                    {grievance.aiClassification?.translatedDescription || grievance.description}
                  </p>
                  {grievance.aiClassification?.translatedDescription && (
                    <details style={{ marginTop: '1rem', borderTop: '1px dashed var(--outline-variant)', paddingTop: '0.5rem' }}>
                      <summary style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Show Original Text</summary>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem', fontStyle: 'italic' }}>{grievance.description}</p>
                    </details>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-container)' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Reported By</p>
                    <p style={{ fontWeight: 600 }}>{grievance.citizenName}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{grievance.citizenEmail}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Location Details</p>
                    {hasLocationDetails ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {/* Confirmed Location */}
                        <div style={{ padding: '0.625rem 0.75rem', background: 'rgba(14,165,164,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14,165,164,0.18)' }}>
                          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>Confirmed Location</p>
                          {grievance.location?.landmark && (
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.15rem' }}>{grievance.location.landmark}</p>
                          )}
                          {(grievance.location?.finalAddress || grievance.location?.address) && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', marginBottom: '0.15rem' }}>
                              {grievance.location.finalAddress || grievance.location.address}
                            </p>
                          )}
                          {grievance.location?.pincode && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Pincode: <strong>{grievance.location.pincode}</strong></p>
                          )}
                          {(grievance.location?.ward || grievance.location?.zone) && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.15rem' }}>
                              {grievance.location.ward && `Ward: ${grievance.location.ward}`}
                              {grievance.location.ward && grievance.location.zone && ' \xb7 '}
                              {grievance.location.zone && `Zone: ${grievance.location.zone}`}
                            </p>
                          )}
                          {grievance.location?.confirmedByUser && (
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(14,165,164,0.12)', padding: '0.1rem 0.4rem', borderRadius: '99px', display: 'inline-block', marginTop: '0.3rem' }}>Citizen Confirmed</span>
                          )}
                        </div>
                        {/* GPS Evidence */}
                        {locationCoordinates.lat !== null && locationCoordinates.lng !== null && (
                          <div style={{ padding: '0.625rem 0.75rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--outline-variant)' }}>
                            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>GPS Evidence</p>
                            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--on-surface)', lineHeight: 1.7 }}>
                              Lat: {formatLocationCoordinate(locationCoordinates.lat)}<br />
                              Lng: {formatLocationCoordinate(locationCoordinates.lng)}
                            </p>
                            {grievance.location?.accuracy !== undefined && grievance.location?.accuracy !== null && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.15rem' }}>
                                Accuracy: {Math.round(Number(grievance.location.accuracy))}m
                                {grievance.location.source && ` \xb7 Source: ${grievance.location.source}`}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Suggested Address (geocoder) */}
                        {grievance.location?.suggestedAddress && (
                          <div style={{ padding: '0.625rem 0.75rem', background: 'rgba(239,153,0,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,153,0,0.18)' }}>
                            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: '#9a5f00', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>Suggested Address (Geocoder)</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, fontStyle: 'italic' }}>{grievance.location.suggestedAddress}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontWeight: 600 }}>Not specified</p>
                    )}
                  </div>
                </div>
              </div>

              <GeoTaggedEvidencePanel evidenceImages={grievance.evidenceImages || []} />

              {/* Before / After Evidence */}
              <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>Before / After Evidence</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                      Citizen evidence and officer proof in one review trail.
                    </p>
                  </div>
                  {grievance.resolutionProof?.uploadedAt && (
                    <span className="badge badge-resolved">Proof uploaded</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.75rem' }}>Citizen Evidence Images</p>
                    <EvidenceImageGrid
                      items={grievance.attachments}
                      emptyText="No citizen evidence images attached."
                    />
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.75rem' }}>Officer Resolution Proof Images</p>
                    <EvidenceImageGrid
                      items={grievance.resolutionProof?.images}
                      emptyText="No resolution proof images uploaded yet."
                      tone="after"
                    />
                  </div>
                </div>
                {grievance.resolutionProof?.note && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(14,165,164,0.06)', border: '1px solid rgba(14,165,164,0.16)', borderRadius: 'var(--radius-md)' }}>
                    <p className="form-label" style={{ marginBottom: '0.35rem' }}>Resolution Note</p>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{grievance.resolutionProof.note}</p>
                  </div>
                )}
              </div>

              {/* Upload Resolution Proof */}
              <form className="card" style={{ padding: '2rem' }} onSubmit={handleResolutionProofSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>Upload Resolution Proof</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                      Add after-repair photos and a short note for the citizen.
                    </p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--ai-teal)' }}>verified</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Resolution Note</label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Describe the repair or action completed..."
                    />
                  </div>
                  <div
                    className="upload-zone"
                    onClick={() => document.getElementById('resolutionProofInput').click()}
                    style={{ padding: '1.5rem' }}
                  >
                    <input
                      id="resolutionProofInput"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleResolutionFileSelect}
                      style={{ display: 'none' }}
                    />
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--ai-teal)', marginBottom: '0.35rem', display: 'block' }}>add_photo_alternate</span>
                    <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Upload after-repair images</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>JPG, PNG, WEBP up to 5MB each</p>
                  </div>
                  {resolutionFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <p className="form-label">Selected Images ({resolutionFiles.length})</p>
                      {resolutionFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.625rem 0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--outline-variant)' }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeResolutionFile(index)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {proofError && (
                    <div style={{ padding: '0.875rem 1rem', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
                      {proofError}
                    </div>
                  )}
                  {proofMessage && (
                    <div style={{ padding: '0.875rem 1rem', background: 'rgba(14,165,164,0.08)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 700 }}>
                      {proofMessage}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={proofUploading}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {proofUploading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>cloud_upload</span>}
                    Submit Proof
                  </button>
                </div>
              </form>

              {/* Timeline */}
              {grievance.timeline?.length > 0 && (
                <div className="card" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Activity Timeline</h3>
                  <div className="timeline">
                    {[...grievance.timeline].reverse().map((entry, i) => (
                      <div key={i} className={`timeline-item ${i === 0 ? 'active' : entry.status === 'resolved' ? 'success' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                          <div>
                            <span className={`badge badge-${entry.status}`}>{statusLabels[entry.status] || entry.status}</span>
                            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{entry.note}</p>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--outline)', whiteSpace: 'nowrap' }}>{formatDate(entry.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Case History Timeline (admin sees all, citizen sees filtered) */}
              <CaseHistoryTimeline grievance={grievance} compact={user?.role === 'citizen'} />

              {/* Audit Trail (admin/department only) */}
              {user?.role !== 'citizen' && (
                <AuditTrailCard grievance={grievance} />
              )}

              {/* Quick Status Update */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Official Note / Response Context</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Enter any specific details for the resolution..."
                    style={{ fontSize: '0.875rem', padding: '0.75rem' }}
                  />
                  <button
                    onClick={handleGenerateDraft}
                    disabled={draftLoading}
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '0.5rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {draftLoading ? <span className="spinner" style={{ width: '0.75rem', height: '0.75rem' }} /> : <Sparkles size={14} />}
                    Generate AI Draft Response
                  </button>
                  {aiDraft && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>AI Drafted Response:</p>
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{aiDraft}</p>
                      <button
                        onClick={() => { setNote(aiDraft); setAiDraft(''); }}
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                      >Use this draft</button>
                    </motion.div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['in-review', 'in-progress', 'resolved'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status, note || `Status updated to ${statusLabels[status]}`)}
                      disabled={updating || grievance.status === status}
                      className={`btn btn-sm ${grievance.status === status ? 'btn-secondary' : 'btn-outline'}`}
                      style={{ opacity: grievance.status === status ? 0.5 : 1 }}
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={handleEscalate}
                        disabled={updating || grievance.status === 'escalated'}
                        className="btn btn-sm btn-outline"
                        style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                      >
                        Escalate to Higher Authority
                      </button>
                      <button
                        onClick={handleReopen}
                        disabled={updating || (grievance.status !== 'resolved' && grievance.status !== 'closed')}
                        className="btn btn-sm btn-outline"
                      >
                        Reopen Complaint
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: AI Intelligence Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '80px' }}>
              {/* Intelligence Layer */}
              <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: '-2rem', right: '-2rem', width: '6rem', height: '6rem',
                  background: 'var(--ai-gradient)', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', position: 'relative' }}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                    background: 'var(--ai-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  }}>
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Intelligence Layer</h3>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>Automated Analysis</p>
                  </div>
                </div>

                {/* AI Summary */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={14} /> AI Official Summary
                  </p>
                  <div style={{ padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--on-surface-variant)', borderLeft: '3px solid var(--ai-teal)' }}>
                    {grievance.aiClassification?.summary || 'No AI summary available.'}
                  </div>
                </div>

                {/* AI Metadata Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Sentiment</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>{grievance.aiClassification?.sentiment || 'Neutral'}</span>
                      {grievance.aiClassification?.isUrgent && <AlertCircle size={14} color="var(--error)" />}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Input Language</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Globe size={14} color="var(--primary)" />
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{grievance.aiClassification?.detectedLanguage || 'English'}</p>
                    </div>
                  </div>
                </div>

                {/* Recommended Routing */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>Confidence Analysis</p>
                  <div style={{ padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700 }}>{grievance.aiClassification?.suggestedDepartment || grievance.department}</span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)',
                        background: 'var(--secondary-container)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                      }}>
                        {grievance.aiClassification?.confidence || 0}% Match
                      </span>
                    </div>
                    {/* Confidence bar */}
                    <div style={{ height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${grievance.aiClassification?.confidence || 0}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        style={{ height: '100%', background: 'var(--ai-gradient)', borderRadius: '2px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      <span>Sub-category: {grievance.category}</span>
                      <span>Priority: <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{grievance.priority}</span></span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <button
                  onClick={() => handleAssign(grievance.aiClassification?.suggestedDepartment || grievance.department)}
                  className="btn btn-primary"
                  disabled={updating}
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>check_circle</span>
                  Approve Classification
                </button>
                <button className="btn btn-outline" style={{ width: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>swap_horiz</span>
                  Reassign Department
                </button>
              </div>

              {/* Priority Badge */}
              <div className="card-flat" style={{ padding: '1.25rem', borderRadius: 'var(--radius-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Priority Level</span>
                  <span className={`badge badge-${grievance.priority}`} style={{ fontSize: '0.8125rem', padding: '0.375rem 1rem' }}>
                    {grievance.priority} Priority
                  </span>
                </div>
              </div>

              {/* Feedback */}
              {grievance.feedback?.rating && (
                <div className="card-flat" style={{ padding: '1.25rem', borderRadius: 'var(--radius-xl)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Citizen Feedback</p>
                    {grievance.feedback.satisfied !== undefined && (
                      <span className={`badge ${grievance.feedback.satisfied ? 'badge-resolved' : 'badge-reopened'}`}>
                        {grievance.feedback.satisfied ? 'Satisfied' : 'Not satisfied'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} className="material-symbols-outlined filled" style={{
                        fontSize: '1.125rem', color: star <= grievance.feedback.rating ? '#ef9900' : 'var(--surface-container-high)',
                      }}>star</span>
                    ))}
                  </div>
                  {grievance.feedback.comment && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                      "{grievance.feedback.comment}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
