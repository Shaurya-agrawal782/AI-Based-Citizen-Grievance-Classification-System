import { useState } from 'react';
import { motion } from 'framer-motion';
import { grievanceAPI } from '../services/api';
import CaseHistoryTimeline from '../components/common/CaseHistoryTimeline';
import { useLanguage } from '../context/LanguageContext';

const statusLabels = {
  'submitted': 'Submitted',
  'in-review': 'In Review',
  'in-progress': 'In Progress',
  'resolved': 'Resolved',
  'escalated': 'Escalated',
  'reopened': 'Reopened',
  'closed': 'Closed',
};

const solutionFlow = [
  { id: 'start', label: 'Start', status: 'submitted', icon: 'play_arrow' },
  { id: 'duplicate', label: 'Duplicate Check', status: 'submitted', icon: 'content_copy' },
  { id: 'process', label: 'Process Continue', status: 'submitted', icon: 'settings' },
  { id: 'categorize', label: 'Categorization', status: 'in-review', icon: 'account_balance' },
  { id: 'priority', label: 'Priority Check', status: 'in-review', icon: 'low_priority' },
  { id: 'assign', label: 'Department Assignment', status: 'in-review', icon: 'groups' },
  { id: 'tracking', label: 'Tracking Active', status: 'in-progress', icon: 'search' },
  { id: 'work', label: 'Work In Progress', status: 'in-progress', icon: 'construction' },
  { id: 'solved', label: 'Resolution Check', status: 'resolved', icon: 'help' },
  { id: 'notify', label: 'Notification', status: 'resolved', icon: 'notifications' },
  { id: 'feedback', label: 'Collect Feedback', status: 'resolved', icon: 'star' },
  { id: 'close', label: 'Closed', status: 'closed', icon: 'verified' },
];

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
        minHeight: '7.5rem',
        border: '1px dashed var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-lowest)',
        color: 'var(--on-surface-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: '0.75rem' }}>
      {images.map((item, index) => (
        <a
          key={`${resolveEvidenceImageUrl(item)}-${index}`}
          href={resolveEvidenceImageUrl(item)}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            overflow: 'hidden',
            borderRadius: 'var(--radius-md)',
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
            padding: '0.45rem 0.5rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--on-surface-variant)',
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

export default function TrackComplaint() {
  const { t } = useLanguage();
  const [trackingId, setTrackingId] = useState('');
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, satisfied: 'yes', comment: '' });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setLoading(true);
    setError('');
    setGrievance(null);
    setFeedbackError('');
    setFeedbackNotice('');
    try {
      const res = await grievanceAPI.track(trackingId.trim().toUpperCase());
      setGrievance(res.data.grievance);
    } catch (err) {
      setError(err.response?.data?.error || 'Grievance not found. Please check the tracking ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!grievance?._id) return;

    const satisfied = feedbackForm.satisfied === 'yes';
    setFeedbackLoading(true);
    setFeedbackError('');
    setFeedbackNotice('');

    try {
      const res = await grievanceAPI.submitFeedback(grievance._id, {
        rating: Number(feedbackForm.rating),
        satisfied,
        comment: feedbackForm.comment
      });

      setGrievance(res.data.grievance);
      setFeedbackNotice(satisfied
        ? 'Thank you for confirming the resolution. Your complaint has been closed.'
        : 'Your complaint has been reopened for review.'
      );
    } catch (err) {
      setFeedbackError(err.response?.data?.error || 'Feedback submission failed.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '800px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{t('ticket.title')}</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>
          Enter your grievance tracking ID to view the current status and resolution timeline.
        </p>

        {/* Search Form */}
        <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--outline)', fontSize: '1.25rem',
            }}>search</span>
            <input
              className="form-input"
              type="text"
              placeholder="Enter Tracking ID (e.g., GRV-9921)"
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              style={{ paddingLeft: '3rem', fontSize: '1rem', padding: '0.875rem 1rem 0.875rem 3rem' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={loading} style={{ padding: '0 2rem' }}>
            {loading ? <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }} /> : 'Track'}
          </button>
        </form>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '1rem', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span className="material-symbols-outlined">error</span>
            {error}
          </motion.div>
        )}

        {/* Results */}
        {grievance && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${grievance.status}`}>{statusLabels[grievance.status]}</span>
                    <span className={`badge badge-${grievance.priority}`}>{grievance.priority} priority</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{grievance.title}</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                    {grievance.trackingId} • {grievance.category} • {grievance.department}
                  </p>
                </div>
              </div>

              {/* Resolution Flow Tracker */}
              <div style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>account_tree</span>
                  Resolution Path (AI-Driven)
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                  {solutionFlow.map((step, i) => {
                    const statusOrder = ['submitted', 'in-review', 'in-progress', 'resolved', 'closed', 'escalated'];
                    const currentIdx = statusOrder.indexOf(grievance.status);
                    const stepIdx = statusOrder.indexOf(step.status);

                    let isActive = stepIdx <= currentIdx;
                    let isCurrent = step.status === grievance.status && (
                      (step.id === 'work' && grievance.status === 'in-progress') ||
                      (step.id === 'categorize' && grievance.status === 'in-review') ||
                      (step.id === 'notify' && grievance.status === 'resolved') ||
                      (i === currentIdx * 2) // Rough mapping
                    );

                    // Special cases for branch statuses
                    if (grievance.status === 'escalated' && step.id === 'priority') isActive = true;
                    if (grievance.status === 'reopened' && stepIdx <= statusOrder.indexOf('in-progress')) isActive = true;

                    return (
                      <div key={step.id} style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isActive ? 'var(--surface-container-low)' : 'var(--surface-container-lowest)',
                        border: `1px solid ${isActive ? 'var(--primary-container)' : 'var(--surface-container-high)'}`,
                        opacity: isActive ? 1 : 0.5,
                        position: 'relative',
                        transition: 'all 0.3s'
                      }}>
                        {isActive && (
                          <div style={{
                            position: 'absolute', top: '-5px', right: '-5px',
                            background: 'var(--primary)', color: 'white',
                            borderRadius: '50%', width: '1.25rem', height: '1.25rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>check</span>
                          </div>
                        )}
                        <span className="material-symbols-outlined" style={{
                          fontSize: '1.5rem',
                          color: isActive ? 'var(--primary)' : 'var(--outline)',
                          marginBottom: '0.5rem',
                          display: 'block'
                        }}>{step.icon}</span>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{step.label}</p>
                        <p style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)' }}>{step.status.replace('-', ' ')}</p>
                      </div>
                    );
                  })}
                </div>

                {grievance.status === 'escalated' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--error)' }}>
                    <p style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="material-symbols-outlined">priority_high</span>
                      Escalated to Higher Authority
                    </p>
                    <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>This complaint has bypassed standard routing due to urgency or delay.</p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Before / After Evidence */}
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>Before / After</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                    Review submitted evidence and the officer resolution proof.
                  </p>
                </div>
                {grievance.resolutionProof?.uploadedAt && (
                  <span className="badge badge-resolved">Resolution proof available</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
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
                    emptyText="Resolution proof images will appear here once uploaded."
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

            {feedbackNotice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '1rem 1.25rem',
                  background: grievance.status === 'reopened' ? 'var(--error-container)' : 'rgba(14,165,164,0.08)',
                  color: grievance.status === 'reopened' ? 'var(--on-error-container)' : 'var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontWeight: 800
                }}
              >
                {feedbackNotice}
              </motion.div>
            )}

            {grievance.status === 'resolved' && !grievance.feedback?.submittedAt && (
              <form className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }} onSubmit={handleFeedbackSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>Resolution Feedback</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                      Let the officer know whether the issue was resolved properly.
                    </p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--warning)' }}>stars</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.75rem' }}>Rating</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFeedbackForm(prev => ({ ...prev, rating }))}
                          className="btn btn-sm"
                          style={{
                            width: '2.75rem',
                            height: '2.5rem',
                            padding: 0,
                            borderRadius: 'var(--radius-md)',
                            background: Number(feedbackForm.rating) === rating ? 'var(--warning)' : 'var(--surface-container-low)',
                            color: Number(feedbackForm.rating) === rating ? '#ffffff' : 'var(--on-surface-variant)',
                            border: '1px solid var(--outline-variant)'
                          }}
                          aria-label={`${rating} star rating`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="form-label" style={{ marginBottom: '0.75rem' }}>Are you satisfied?</p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {[
                        { value: 'yes', label: 'Yes, resolved', icon: 'check_circle' },
                        { value: 'no', label: 'No, reopen', icon: 'report_problem' }
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFeedbackForm(prev => ({ ...prev, satisfied: option.value }))}
                          className="btn btn-outline"
                          style={{
                            borderColor: feedbackForm.satisfied === option.value ? 'var(--primary)' : 'var(--outline-variant)',
                            background: feedbackForm.satisfied === option.value ? 'rgba(14,165,164,0.08)' : 'rgba(255,255,255,0.75)',
                            color: feedbackForm.satisfied === option.value ? 'var(--primary)' : 'var(--on-surface)'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{option.icon}</span>
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {feedbackForm.satisfied === 'no' && (
                      <p style={{ marginTop: '0.75rem', color: 'var(--error)', fontSize: '0.875rem', fontWeight: 700 }}>
                        This will reopen your complaint for review.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Comment</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={feedbackForm.comment}
                      onChange={e => setFeedbackForm(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Add a short note for the officer..."
                    />
                  </div>

                  {feedbackError && (
                    <div style={{ padding: '0.875rem 1rem', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 700 }}>
                      {feedbackError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={feedbackLoading} style={{ alignSelf: 'flex-start' }}>
                    {feedbackLoading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>send</span>}
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}

            {grievance.feedback?.submittedAt && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: '0.35rem' }}>Feedback Submitted</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                      Rating: {grievance.feedback.rating}/5
                      {grievance.feedback.comment ? ` - ${grievance.feedback.comment}` : ''}
                    </p>
                  </div>
                  {grievance.feedback.satisfied !== undefined && (
                    <span className={`badge ${grievance.feedback.satisfied ? 'badge-resolved' : 'badge-reopened'}`}>
                      {grievance.feedback.satisfied ? 'Satisfied' : 'Not satisfied'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            {grievance.timeline && grievance.timeline.length > 0 && (
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Resolution Timeline</h3>
                <div className="timeline">
                  {[...grievance.timeline].reverse().map((entry, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`timeline-item ${i === 0 ? 'active' : entry.status === 'resolved' || entry.status === 'closed' ? 'success' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          <span className={`badge badge-${entry.status}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                            {statusLabels[entry.status] || entry.status}
                          </span>
                          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{entry.note}</p>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--outline)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Case History Timeline - citizen-visible updates */}
            {grievance.caseHistory && grievance.caseHistory.length > 0 && (
              <CaseHistoryTimeline grievance={grievance} compact={true} />
            )}
          </motion.div>
        )}

        {/* Demo Help */}
        {!grievance && !error && (
          <div className="card-flat" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Try tracking these sample IDs:</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['GRV-9921', 'GRV-9918', 'GRV-9910', 'GRV-9905'].map(id => (
                <button
                  key={id}
                  onClick={() => { setTrackingId(id); }}
                  style={{
                    padding: '0.375rem 0.75rem', background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--primary)', cursor: 'pointer', border: '1px solid var(--outline-variant)',
                  }}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
