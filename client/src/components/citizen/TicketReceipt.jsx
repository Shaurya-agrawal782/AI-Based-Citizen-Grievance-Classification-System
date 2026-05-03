import React, { useState } from 'react';
import { Copy, Check, Download, Share2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="btn btn-outline btn-sm premium-button-hover"
      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
    >
      {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

const PRIORITY_COLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981' };
const STATUS_COLOR   = {
  'Ticket Created': '#8b5cf6',
  'AI Classified': 'var(--primary)',
  'SLA Assigned': '#f59e0b',
  'Officer Assigned': '#10b981',
  'Field Team Dispatch Pending': '#f97316',
  'Resolution Awaited': '#64748b',
};

export default function TicketReceipt({
  ticketId    = 'CT-TKT-2026-0001',
  complaintId = 'CT-2026-0001',
  category    = 'Electricity',
  department  = 'Electricity Department',
  priority    = 'Critical',
  status      = 'Field Team Dispatch Pending',
  sla         = '4 hours',
  assignedOfficer = 'Rahul Verma',
  officerRole     = 'Ward Electricity Officer',
  ward   = 'Ward 1',
  zone   = 'North',
  submittedAt = new Date().toISOString(),
  trackingUrl,
}) {
  const shouldReduceMotion = useReducedMotion();
  const resolvedUrl = trackingUrl || `${window.location.origin}/track-ticket?ticket=${ticketId}`;
  const priorityColor = PRIORITY_COLOR[priority] || 'var(--primary)';
  const statusColor   = STATUS_COLOR[status]    || 'var(--primary)';
  const [sharedCopied, setSharedCopied] = useState(false);

  const shareMsg = `Your CivicTrust ticket ${ticketId} has been created for ${category} complaint with ${priority} priority. Track here: ${resolvedUrl}`;

  const handleDownload = () => {
    const lines = [
      '=== CivicTrust AI — Ticket Receipt ===',
      '',
      `Ticket ID:        ${ticketId}`,
      `Complaint ID:     ${complaintId}`,
      `Category:         ${category}`,
      `Department:       ${department}`,
      `Priority:         ${priority}`,
      `Status:           ${status}`,
      `SLA Window:       ${sla}`,
      '',
      `Assigned Officer: ${assignedOfficer}`,
      `Officer Role:     ${officerRole}`,
      `Ward:             ${ward}`,
      `Zone:             ${zone}`,
      '',
      `Submitted At:     ${new Date(submittedAt).toLocaleString('en-IN')}`,
      `Tracking URL:     ${resolvedUrl}`,
      '',
      '========================================',
      'Thank you for using CivicTrust AI.',
    ].join('\n');

    const url = URL.createObjectURL(new Blob([lines], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `CivicTrust_Ticket_${ticketId}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="animate-card">
    <div className="card premium-card-hover ticket-receipt-card" style={{ padding: '2rem', borderTop: `4px solid ${priorityColor}` }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
            CivicTrust Ticket Receipt
          </p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{ticketId}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>Complaint: {complaintId}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <span className="badge" style={{ background: `${priorityColor}20`, color: priorityColor, fontWeight: 700, padding: '0.375rem 0.875rem' }}>{priority} Priority</span>
          <span className="badge" style={{ background: `${statusColor}15`, color: statusColor, fontWeight: 600, padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>{status}</span>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Category',         value: category },
          { label: 'Department',        value: department },
          { label: 'SLA Window',        value: sla },
          { label: 'Assigned Officer',  value: assignedOfficer },
          { label: 'Officer Role',      value: officerRole },
          { label: 'Ward / Zone',       value: `${ward} ${zone}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Submitted</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{new Date(submittedAt).toLocaleString('en-IN')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Tracking URL</p>
          <a href={resolvedUrl} style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>{resolvedUrl}</a>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <CopyBtn text={ticketId} label="Copy Ticket ID" />
        <CopyBtn text={resolvedUrl} label="Copy Link" />
        <button type="button" onClick={handleDownload} className="btn btn-outline btn-sm premium-button-hover" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Download size={14} /> Download Ticket
        </button>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(shareMsg); setSharedCopied(true); setTimeout(() => setSharedCopied(false), 2000); }}
          className="btn btn-secondary btn-sm premium-button-hover"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          {sharedCopied ? <Check size={14} /> : <Share2 size={14} />}
          {sharedCopied ? 'Copied!' : 'Share Ticket'}
        </button>
      </div>
    </div>
    </motion.div>
  );
}
