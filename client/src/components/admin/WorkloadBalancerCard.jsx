import React from 'react';
import { officerWorkload } from '../../data/officerWorkload';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

const LOAD_CONFIG = {
  Low:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', bar: 0.2 },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  bar: 0.55 },
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   bar: 0.9 },
};

export default function WorkloadBalancerCard({ filterDepartment }) {
  const shouldReduceMotion = useReducedMotion();
  const filtered = filterDepartment
    ? officerWorkload.filter(o => o.department.toLowerCase().includes(filterDepartment.toLowerCase()))
    : officerWorkload;

  // Determine recommendation: prefer the officer in same dept with lowest load
  const sorted = [...filtered].sort((a, b) => a.activeCases - b.activeCases);
  const recommended = sorted[0];
  const primary = sorted.find(o => o.loadLevel === 'High') || null;

  const recommendationText = primary
    ? `${primary.officerName} (${primary.ward}) is overloaded. Recommending ${recommended?.officerName} (${recommended?.ward}) as backup based on lower active caseload.`
    : recommended
    ? `Recommended: ${recommended.officerName} in ${recommended.ward} — lowest active workload (${recommended.activeCases} cases).`
    : 'All officers are within acceptable workload limits.';

  return (
    <div className="card premium-card-hover" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', color: '#8b5cf6' }}>
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Workload Balancer</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Smart assignment based on active officer load</p>
        </div>
      </div>

      {/* Rebalance suggestion */}
      <div style={{ padding: '0.875rem 1rem', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--on-surface)' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '0.25rem' }}>Rebalance Suggestion</p>
        {recommendationText}
      </div>

      {/* Officer cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((officer, i) => {
          const cfg = LOAD_CONFIG[officer.loadLevel] || LOAD_CONFIG.Medium;
          const isRecommended = officer.officerName === recommended?.officerName;
          return (
            <motion.div
              key={i}
              className="animate-card"
              initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
            <div
              className="premium-card-hover"
              style={{
                padding: '1rem',
                background: isRecommended ? 'rgba(16,185,129,0.04)' : 'var(--surface-container-low)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isRecommended ? 'rgba(16,185,129,0.2)' : 'var(--outline-variant)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                    {officer.officerName}
                    {isRecommended && <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.125rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>★ Recommended</span>}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{officer.department} · {officer.ward} {officer.zone}</p>
                </div>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 700 }}>
                  {officer.loadLevel}
                </span>
              </div>

              {/* Load bar */}
              <div style={{ height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <motion.div
                  initial={shouldReduceMotion ? false : { width: 0 }}
                  animate={{ width: `${cfg.bar * 100}%` }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, delay: i * 0.08 }}
                  style={{ height: '100%', background: cfg.color, borderRadius: '2px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Active Cases: <strong>{officer.activeCases}</strong></span>
                <span style={{ color: officer.criticalCases > 0 ? '#ef4444' : 'var(--on-surface-variant)' }}>
                  Critical: <strong>{officer.criticalCases}</strong>
                </span>
              </div>
            </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
