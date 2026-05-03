import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ShieldCheck, UserCheck, Clock, FileText, ChevronDown, ChevronRight, Bot, AlertTriangle } from 'lucide-react';

const ACTION_CONFIG = {
  GRIEVANCE_CREATED:        { icon: FileText,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Grievance Created' },
  AI_CLASSIFICATION_APPLIED:{ icon: Bot,         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'AI Classification Applied' },
  STATUS_UPDATED:           { icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Status Updated' },
  GRIEVANCE_ASSIGNED:       { icon: UserCheck,   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Grievance Assigned' },
  GRIEVANCE_ESCALATED:      { icon: AlertTriangle,color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Escalated' },
  GRIEVANCE_CLOSED:         { icon: ShieldCheck, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Grievance Closed' },
  GRIEVANCE_REOPENED:       { icon: History,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Grievance Reopened' },
  CITIZEN_FEEDBACK_RECEIVED:{ icon: UserCheck,   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Citizen Feedback' },
};

const AuditEntryRow = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[entry.action] || { icon: History, color: 'var(--on-surface-variant)', bg: 'rgba(0,0,0,0.05)', label: entry.action };
  const Icon = config.icon;

  const hasValues = entry.oldValue || entry.newValue;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex',
        gap: '1rem',
        paddingBottom: '1.25rem',
        marginBottom: '0.25rem',
        position: 'relative'
      }}
    >
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '2rem', height: '2rem', borderRadius: '50%',
          background: config.bg, color: config.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${config.color}33`, flexShrink: 0
        }}>
          <Icon size={14} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--on-surface)' }}>{config.label}</span>
            {entry.systemGenerated && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', fontWeight: 600, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>AI</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
            {new Date(entry.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', lineHeight: 1.4 }}>
          {entry.reason}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--outline)' }}>
          <UserCheck size={12} />
          <span>{entry.performedBy?.name || 'System'}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ textTransform: 'capitalize' }}>{entry.performedBy?.role || 'system'}</span>
        </div>

        {hasValues && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {expanded ? 'Hide details' : 'View change details'}
          </button>
        )}

        <AnimatePresence>
          {expanded && hasValues && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: entry.oldValue ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                {entry.oldValue && (
                  <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Before</p>
                    <pre style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(entry.oldValue, null, 2)}
                    </pre>
                  </div>
                )}
                {entry.newValue && (
                  <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem', textTransform: 'uppercase' }}>After</p>
                    <pre style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(entry.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default function AuditTrailCard({ grievance }) {
  const trail = grievance?.auditTrail;

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', color: '#8b5cf6' }}>
          <History size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Audit Trail</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Immutable log of all system and user actions</p>
        </div>
        {trail?.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
            {trail.length} event{trail.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!trail || trail.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>
          <History size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.5rem' }} />
          <p style={{ fontSize: '0.875rem' }}>No audit events recorded yet.</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: '0.9375rem', top: '1rem', bottom: 0,
            width: '1.5px', background: 'var(--surface-container-high)'
          }} />
          {[...trail].reverse().map((entry, i) => (
            <AuditEntryRow key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
