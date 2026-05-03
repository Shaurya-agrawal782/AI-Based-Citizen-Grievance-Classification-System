import React, { useState } from 'react';
import { Mic, Zap, Target, ShieldCheck, Layers, Bot, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function PitchScriptCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: '2rem', border: '2px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ padding: '0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '8px' }}>
              <Mic size={20} />
            </span>
            60-Second Winning Pitch
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>Read this to the judges during the live demo.</p>
        </div>
      </div>

      <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--primary)', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.8, fontStyle: 'italic', fontWeight: 500 }}>
          "CivicTrust AI converts unstructured citizen complaints into actionable governance workflows. A citizen can speak in Hindi or Hinglish, the system detects language, classifies the issue, identifies safety-critical urgency, routes it to the correct ward officer, clusters duplicate reports, starts an SLA timer, and records every action for accountability. This is not just complaint registration; it is <strong style={{ color: 'var(--primary)' }}>intelligent grievance redressal</strong>."
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Technical Differentiators</h3>
        <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-sm">
          {expanded ? <><ChevronUp size={16} /> Hide Details</> : <><ChevronDown size={16} /> Show Architecture</>}
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            { icon: Bot, title: "Modular AI Layer", desc: "Decoupled architecture for Language, Classification, and Urgency." },
            { icon: AlertTriangle, title: "Policy-Backed SLA", desc: "Deterministic SLA timers based on AI severity detection." },
            { icon: Target, title: "Authority Routing", desc: "Dynamic mapping to Ward/Zone specific officers." },
            { icon: Layers, title: "Semantic Clustering", desc: "Groups duplicates to prevent redundant field dispatches." },
            { icon: Zap, title: "Adaptive Taxonomy", admin: true, desc: "Admins update rules/categories without deploying code." },
            { icon: ShieldCheck, title: "Privacy-First Masking", desc: "Regex-based PII redaction before external AI processing." }
          ].map((feature, i) => (
            <div key={i} style={{ padding: '1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                <feature.icon size={16} />
                <span style={{ fontSize: '0.875rem' }}>{feature.title}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
