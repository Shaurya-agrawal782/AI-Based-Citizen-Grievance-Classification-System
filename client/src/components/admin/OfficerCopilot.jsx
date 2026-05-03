import React, { useState } from 'react';
import { UserCheck, ShieldCheck, CheckCircle2, ClipboardList, Send, AlertTriangle } from 'lucide-react';

export default function OfficerCopilot({ category, priority, standalone = false }) {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const getActionPlan = () => {
    const cat = (category || '').toLowerCase();
    const pri = (priority || '').toLowerCase();

    if (pri === 'critical' || cat.includes('electric')) {
      return [
        "Dispatch electricity field team immediately.",
        "Isolate power supply near affected pole.",
        "Secure area around school/residential zone.",
        "Upload inspection photo.",
        "Resolve or escalate within 4-hour SLA."
      ];
    } else if (cat.includes('water')) {
      return [
        "Check supply line for disruption.",
        "Inspect leakage/contamination source.",
        "Send repair team.",
        "Update citizen after inspection."
      ];
    } else if (cat.includes('sanitation') || cat.includes('waste')) {
      return [
        "Assign sanitation team.",
        "Clear waste/drain blockage.",
        "Disinfect area if health risk exists.",
        "Upload before-after photo."
      ];
    } else if (cat.includes('road') || cat.includes('public works')) {
      return [
        "Inspect road hazard.",
        "Place temporary warning barrier.",
        "Assign repair crew.",
        "Update expected repair timeline."
      ];
    } else {
      return [
        "Ask citizen for missing details.",
        "Verify location accuracy.",
        "Manually classify complaint."
      ];
    }
  };

  const plan = getActionPlan();

  const handleCopy = () => {
    navigator.clipboard.writeText(plan.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`card premium-card-hover ${standalone ? '' : 'card-flat'}`} style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.5rem', background: 'var(--primary-container)', borderRadius: '8px', color: 'var(--primary)' }}>
          <UserCheck size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Officer Action Assistant</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Suggested field actions based on department, priority and SLA.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {plan.map((action, i) => (
          <div key={i} onClick={() => setActiveStep(i)} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: activeStep === i ? 'var(--surface-container)' : 'transparent', transition: 'all 0.2s' }}>
            <div style={{ marginTop: '0.125rem', color: activeStep >= i ? 'var(--primary)' : 'var(--outline)' }}>
              {activeStep > i ? <CheckCircle2 size={18} fill="var(--primary)" color="white" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${activeStep === i ? 'var(--primary)' : 'var(--outline)'}` }} />}
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: activeStep === i ? 700 : 500, color: activeStep >= i ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
              {action}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <button onClick={handleCopy} className="btn btn-outline btn-sm premium-button-hover" style={{ display: 'flex', justifyContent: 'center' }}>
          {copied ? <CheckCircle2 size={16} color="var(--primary)" /> : <ClipboardList size={16} />}
          {copied ? 'Copied' : 'Copy Plan'}
        </button>
        <button onClick={() => setActiveStep(prev => Math.min(prev + 1, plan.length))} className="btn btn-primary btn-sm premium-button-hover" style={{ display: 'flex', justifyContent: 'center' }} disabled={activeStep >= plan.length}>
          <Send size={16} /> Next Step
        </button>
      </div>
    </div>
  );
}
