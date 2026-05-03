import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, Globe, MessageSquare, ArrowLeft, Mail } from 'lucide-react';
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Location Details</p>
                    <p style={{ fontWeight: 600 }}>{grievance.location?.address || 'Not specified'}</p>
                    {grievance.location?.coordinates?.lat ? (
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                        {grievance.location.coordinates.lat.toFixed(4)}° N, {grievance.location.coordinates.lng.toFixed(4)}° W
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

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
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Citizen Feedback</p>
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
