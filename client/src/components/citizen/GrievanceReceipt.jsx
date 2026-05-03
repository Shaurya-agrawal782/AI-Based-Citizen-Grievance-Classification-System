import React, { useState } from 'react';
import { Copy, Check, Download, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={handleCopy} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

export default function GrievanceReceipt({
  complaintId = 'CT-2026-0001',
  category = 'Electricity',
  department = 'Electricity Department',
  priority = 'Critical',
  sla = '4 hours',
  assignedOfficer = 'Rahul Verma',
  officerRole = 'Ward Electricity Officer',
  ward = 'Ward 1',
  zone = 'North',
  status = 'In Progress',
  submittedAt = new Date().toISOString(),
}) {
  const trackingUrl = `${window.location.origin}/track?id=${complaintId}`;
  const shareMessage = `Your grievance ${complaintId} has been registered under ${category} with ${priority} priority. It has been routed to ${assignedOfficer}, ${officerRole}, ${ward} ${zone}. Track it here: ${trackingUrl}`;

  const [sharedCopied, setSharedCopied] = useState(false);

  const handleShareCopy = () => {
    navigator.clipboard.writeText(shareMessage);
    setSharedCopied(true);
    setTimeout(() => setSharedCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = [
      `=== CivicTrust AI – Grievance Receipt ===`,
      ``,
      `Complaint ID:   ${complaintId}`,
      `Category:       ${category}`,
      `Department:     ${department}`,
      `Priority:       ${priority}`,
      `SLA:            ${sla}`,
      `Status:         ${status}`,
      ``,
      `Assigned Officer: ${assignedOfficer}`,
      `Officer Role:     ${officerRole}`,
      `Ward:           ${ward}`,
      `Zone:           ${zone}`,
      ``,
      `Submitted At:   ${new Date(submittedAt).toLocaleString('en-IN')}`,
      `Tracking Link:  ${trackingUrl}`,
      ``,
      `===========================================`,
      `Thank you for using CivicTrust AI.`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CivicTrust_Receipt_${complaintId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const priorityColor = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#f59e0b',
    Low: '#10b981',
  }[priority] || 'var(--primary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ padding: '2rem', borderTop: `4px solid ${priorityColor}` }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            Grievance Receipt
          </p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{complaintId}</h3>
        </div>
        <span
          className="badge"
          style={{ background: `${priorityColor}20`, color: priorityColor, fontSize: '0.875rem', padding: '0.375rem 0.875rem', fontWeight: 700 }}
        >
          {priority} Priority
        </span>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Category', value: category },
          { label: 'Department', value: department },
          { label: 'SLA Window', value: sla },
          { label: 'Status', value: status },
          { label: 'Assigned Officer', value: assignedOfficer },
          { label: 'Officer Role', value: officerRole },
          { label: 'Ward', value: ward },
          { label: 'Zone', value: zone },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Submitted At</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{new Date(submittedAt).toLocaleString('en-IN')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Tracking Link</p>
          <a href={trackingUrl} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>{trackingUrl}</a>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <CopyButton text={complaintId} label="Copy ID" />
        <CopyButton text={trackingUrl} label="Copy Link" />
        <button type="button" onClick={handleDownload} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Download size={14} /> Download Receipt
        </button>
        <button type="button" onClick={handleShareCopy} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {sharedCopied ? <Check size={14} /> : <Share2 size={14} />}
          {sharedCopied ? 'Copied!' : 'Share Status'}
        </button>
      </div>
    </motion.div>
  );
}
