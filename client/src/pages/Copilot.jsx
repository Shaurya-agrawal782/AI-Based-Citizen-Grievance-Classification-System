import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import GrievanceCopilot from '../components/citizen/GrievanceCopilot';
import OfficerCopilot from '../components/admin/OfficerCopilot';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, PenLine, ShieldCheck, UserCheck } from 'lucide-react';
import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';

export default function Copilot() {
  const [activeTab, setActiveTab] = useState('citizen');
  const shouldReduceMotion = useReducedMotion();

  const demoGrievance = {
    category: 'Electricity',
    priority: 'Critical',
  };

  const tabs = [
    { id: 'citizen', label: 'Citizen Writer', icon: PenLine },
    { id: 'officer', label: 'Officer Action Assistant', icon: UserCheck },
  ];

  return (
    <div className="page-wrapper page-shell app-warm-bg">
      <Navbar />
      <div className="container page-content" style={{ maxWidth: '1180px' }}>
        <motion.div className="animate-page-hero" variants={heroReveal} {...pageRevealProps(shouldReduceMotion)} style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div className="badge badge-ai" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem', marginBottom: '1rem' }}>
            <FileText size={16} /> CivicDraft AI
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.25rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1, marginBottom: '1rem', color: 'var(--on-surface)' }}>
            CivicDraft AI
          </h1>
          <p style={{ fontSize: '1.18rem', color: 'var(--on-surface-variant)', maxWidth: '720px', margin: '0 auto', lineHeight: 1.65 }}>
            Turn rough citizen words into clear, formal and actionable grievance applications.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}>
            {['Citizen Friendly', 'Formal Application', 'Emergency Report', 'Copy Ready'].map((chip) => (
              <span key={chip} className="badge badge-in-progress premium-card-hover" style={{ padding: '0.55rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 800, boxShadow: 'var(--shadow-sm)' }}>
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'inline-flex', padding: '0.35rem', borderRadius: '999px', gap: '0.35rem', flexWrap: 'wrap' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="premium-button-hover"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.1rem',
                      borderRadius: '999px',
                      background: isActive ? 'var(--ai-gradient)' : 'transparent',
                      color: isActive ? 'white' : 'var(--on-surface-variant)',
                      fontWeight: 800,
                      boxShadow: isActive ? '0 14px 28px -18px rgba(0,35,111,0.8)' : 'none',
                    }}
                  >
                    <Icon size={17} /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'citizen' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>
              <div className="warm-accent-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--ai-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PenLine size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.25rem' }}>Citizen Writer</h2>
                  <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    Draft in everyday language. CivicDraft AI turns it into a clearer complaint, a formal application, and a safety-first emergency report.
                  </p>
                </div>
              </div>
              <GrievanceCopilot initialText="School ke paas bijli ka pole spark kar raha hai..." />
            </div>
          ) : (
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <div className="glass-card premium-card-hover soft-glow-hover" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--surface-container)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.25rem' }}>Officer Action Assistant</h2>
                    <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                      Suggested field actions based on department, priority and SLA.
                    </p>
                  </div>
                </div>
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-error">Critical Priority</span>
                  <span className="badge">Electricity Dept</span>
                  <span className="badge">4-hour SLA</span>
                </div>
                <OfficerCopilot category={demoGrievance.category} priority={demoGrievance.priority} standalone={false} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
