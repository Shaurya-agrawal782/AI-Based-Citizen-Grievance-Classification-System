import React from 'react';
import { Network } from 'lucide-react';

export default function IncidentClusterCard({ duplicateCheck }) {
  if (!duplicateCheck || !duplicateCheck.isDuplicate) return null;

  return (
    <div style={{
      padding: '1rem',
      background: 'var(--error-container)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--error)',
      marginTop: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--on-error-container)', fontWeight: 700 }}>
        <Network size={18} />
        <span style={{ fontSize: '0.875rem' }}>Incident Cluster Detected</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem', color: 'var(--on-error-container)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.8 }}>Cluster ID:</span>
            <span style={{ fontWeight: 600 }}>{duplicateCheck.clusterId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.8 }}>Related Complaints:</span>
            <span style={{ fontWeight: 600 }}>{duplicateCheck.matchedComplaints}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.8 }}>Similarity Score:</span>
            <span style={{ fontWeight: 600 }}>{(duplicateCheck.similarity * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.8 }}>Severity:</span>
            <span style={{ fontWeight: 600 }}>{duplicateCheck.clusterSeverity}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.8 }}>Location:</span>
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
              {duplicateCheck.clusterLocation}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.25rem' }}>Match Reasons:</p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', opacity: 0.9 }}>
          {duplicateCheck.reasons?.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
