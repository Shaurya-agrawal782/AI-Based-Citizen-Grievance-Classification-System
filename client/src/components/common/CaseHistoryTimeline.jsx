import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldCheck, AlertTriangle, UserCheck, History, FileText, Eye, EyeOff } from 'lucide-react';

const STATUS_CONFIG = {
  submitted:    { icon: FileText,    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Submitted' },
  'in-review':  { icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'In Review' },
  'in-progress':{ icon: UserCheck,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'In Progress' },
  resolved:     { icon: ShieldCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Resolved' },
  closed:       { icon: ShieldCheck, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Closed' },
  escalated:    { icon: AlertTriangle,color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Escalated' },
  reopened:     { icon: History,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Reopened' },
};

const VisibilityBadge = ({ visibility }) => {
  if (!visibility || visibility === 'internal') return null;
  const isPublic = visibility === 'public';
  return (
    <span style={{
      fontSize: '0.625rem', fontWeight: 700,
      color: isPublic ? '#10b981' : '#3b82f6',
      background: isPublic ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
      padding: '0.125rem 0.5rem', borderRadius: '999px',
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      textTransform: 'uppercase'
    }}>
      {isPublic ? <Eye size={9} /> : <Eye size={9} />}
      {isPublic ? 'Public' : 'Citizen'}
    </span>
  );
};

export default function CaseHistoryTimeline({ grievance, compact = false }) {
  const history = grievance?.caseHistory;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', color: '#3b82f6' }}>
          <Clock size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Case History</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            {compact ? 'Your complaint journey' : 'Full case timeline with visibility controls'}
          </p>
        </div>
        {history?.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
            {history.length} update{history.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!history || history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>
          <Clock size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.5rem' }} />
          <p style={{ fontSize: '0.875rem' }}>No case history recorded yet.</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline vertical line */}
          <div style={{
            position: 'absolute', left: '0.9375rem', top: '1rem', bottom: 0,
            width: '1.5px', background: 'var(--surface-container-high)'
          }} />

          {history.map((entry, i) => {
            const config = STATUS_CONFIG[entry.status] || { icon: History, color: 'var(--on-surface-variant)', bg: 'rgba(0,0,0,0.05)', label: entry.status };
            const Icon = config.icon;
            const isLatest = i === history.length - 1;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  paddingBottom: isLatest ? 0 : '1.25rem',
                  position: 'relative'
                }}
              >
                {/* Status dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    background: config.bg, color: config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${config.color}44`,
                    boxShadow: isLatest ? `0 0 0 3px ${config.color}22` : 'none',
                    flexShrink: 0, zIndex: 1, position: 'relative'
                  }}>
                    <Icon size={14} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: 700,
                      color: config.color
                    }}>{config.label}</span>
                    {!compact && entry.visibility && entry.visibility !== 'internal' && (
                      <VisibilityBadge visibility={entry.visibility} />
                    )}
                    {!compact && entry.visibility === 'internal' && (
                      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--outline)', background: 'var(--surface-container)', padding: '0.125rem 0.5rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <EyeOff size={9} /> Internal
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                    {entry.note}
                  </p>

                  {entry.actor && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <UserCheck size={11} />
                      {entry.actor.name}
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span style={{ textTransform: 'capitalize' }}>{entry.actor.role}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
