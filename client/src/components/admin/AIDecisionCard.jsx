import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, ShieldAlert, MapPin, Clock, Route, Languages, Network, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import IncidentClusterCard from './IncidentClusterCard';

export default function AIDecisionCard({ grievance }) {
  const shouldReduceMotion = useReducedMotion();
  // Defensive extraction of AI metadata
  const ai = grievance?.ai || grievance?.aiClassification || grievance?.analysis || grievance?.metadata;

  if (!ai || (!ai.priority && !ai.category && !ai.department && !ai.language)) {
    return (
      <div className="premium-card-hover soft-glow-hover" style={{
        padding: '1.5rem',
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: '2rem',
        border: '1px solid var(--outline-variant)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Brain className="text-primary" size={24} />
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>AI Decision Intelligence</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Classification, urgency, routing and explainability</p>
          </div>
        </div>
        <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            AI decision details will appear here after intelligent analysis is connected.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
             <span className="badge badge-primary">Category: {grievance?.category || 'N/A'}</span>
             <span className="badge badge-secondary">Department: {grievance?.department || 'N/A'}</span>
             <span className="badge badge-outline">Priority: {grievance?.priority || 'N/A'}</span>
             <span className={`badge badge-${grievance?.status}`}>{grievance?.status || 'N/A'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Determine badge colors based on priority
  const getPriorityColor = (p) => {
    const lower = (p || '').toLowerCase();
    if (lower === 'critical') return '#ef4444'; // red
    if (lower === 'urgent') return '#f59e0b'; // orange/yellow
    if (lower === 'normal') return '#3b82f6'; // blue
    return '#8b5cf6'; // purple/gray for review
  };

  const priorityColor = getPriorityColor(ai.priority || grievance.priority);

  return (
    <motion.div
      className="animate-card"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
    <div
      className="premium-card-hover soft-glow-hover"
      style={{
        padding: '1.5rem',
        background: 'var(--surface-container-lowest)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: '2rem',
        border: '1px solid var(--outline-variant)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-container)', paddingBottom: '1rem' }}>
        <div style={{ padding: '0.5rem', background: 'var(--primary-container)', borderRadius: 'var(--radius-lg)' }}>
          <Brain style={{ color: 'var(--primary)' }} size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}>AI Decision Intelligence</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Classification, urgency, routing and explainability</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

        {/* Classification Block */}
        <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-container)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            <Network size={18} />
            <span style={{ fontSize: '0.875rem' }}>Classification</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Category:</span>
              <span style={{ fontWeight: 500 }}>{ai.category || grievance.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Department:</span>
              <span style={{ fontWeight: 500 }}>{ai.department || grievance.department}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Confidence:</span>
              <span style={{ fontWeight: 500 }}>{ai.confidence ? `${ai.confidence}%` : 'N/A'} {ai.confidenceBand ? `(${ai.confidenceBand})` : ''}</span>
            </div>
            {ai.requiresHumanReview && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                <AlertTriangle size={14} /> Human Review Required
              </div>
            )}
          </div>
        </div>

        {/* Urgency + SLA Block */}
        <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: `1px solid ${priorityColor}40` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: priorityColor, fontWeight: 600 }}>
            <Clock size={18} />
            <span style={{ fontSize: '0.875rem' }}>Urgency & SLA</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Priority:</span>
              <span style={{ fontWeight: 600, color: 'white', backgroundColor: priorityColor, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                {ai.priority || grievance.priority || 'Normal'}
              </span>
            </div>
            {ai.severityLevel && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Severity:</span>
                <span style={{ fontWeight: 500 }}>{ai.severityLevel}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>SLA Status:</span>
              <span style={{ fontWeight: 500 }}>{ai.sla?.status || (ai.slaHours ? `${ai.slaHours} hours` : 'N/A')}</span>
            </div>
            {(ai.sla?.escalationRequired || ai.escalationRequired) && (
              <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                <ShieldAlert size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Escalation: {ai.sla?.escalationReason || ai.escalationReason || 'Required'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Routing Block */}
        <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-container)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            <Route size={18} />
            <span style={{ fontSize: '0.875rem' }}>Routing Intelligence</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            {ai.routing?.ward ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Location:</span>
                  <span style={{ fontWeight: 500 }}>{ai.routing.ward}, Zone {ai.routing.zone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Authority:</span>
                  <span style={{ fontWeight: 500 }}>{ai.routing.assignedAuthority}</span>
                </div>
                {ai.routing.officerName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--on-surface-variant)' }}>Officer:</span>
                    <span style={{ fontWeight: 500 }}>{ai.routing.officerName} ({ai.routing.officerContact})</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>Detailed routing not available</div>
            )}
          </div>
        </div>

        {/* Language & Duplicates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-container)', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
              <Languages size={18} />
              <span style={{ fontSize: '0.875rem' }}>Language</span>
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Detected: </span>
              <span style={{ fontWeight: 500 }}>{ai.language || ai.detectedLanguage || 'English'}</span>
              {(ai.translatedText || ai.translatedDescription) && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>Translation:</span>
                  {ai.translatedText || ai.translatedDescription}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-container)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
              <CheckCircle size={18} />
              <span style={{ fontSize: '0.875rem' }}>Duplicate Check</span>
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Duplicate Detected: </span>
              <span style={{ fontWeight: 500 }}>{ai.duplicateCheck?.isDuplicate ? 'Yes' : 'No'}</span>
            </div>
            <IncidentClusterCard duplicateCheck={ai.duplicateCheck} />
          </div>
        </div>

      </div>

      {/* Explainability Block */}
      {(ai.reasoning?.length > 0 || ai.adminSummary) && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-container)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 600 }}>
            <Info size={18} />
            <span style={{ fontSize: '0.875rem' }}>Explainability & Reasoning</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {ai.reasoning && ai.reasoning.length > 0 && (
              <div style={{ background: 'var(--surface-container-low)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                  {ai.reasoning.map((reason, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {(ai.adminSummary || ai.suggestedAction) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ai.adminSummary && (
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)', marginRight: '0.5rem' }}>Admin Summary:</span>
                    {ai.adminSummary}
                  </div>
                )}
                {ai.suggestedAction && (
                  <div style={{ fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)', marginRight: '0.5rem' }}>Suggested Action:</span>
                    <span style={{ color: priorityColor, fontWeight: 500 }}>{ai.suggestedAction}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </motion.div>
  );
}
