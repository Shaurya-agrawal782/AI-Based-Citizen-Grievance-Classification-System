import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Copy, PhoneCall, RotateCcw, Volume2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import TicketReceipt from '../components/citizen/TicketReceipt';
import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';

const categoryByKey = {
  1: 'Electricity',
  2: 'Water Supply',
  3: 'Sanitation',
  4: 'Roads',
  5: 'Public Safety',
};

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '#'],
];

const scriptLines = [
  'Welcome to CivicTrust AI grievance helpline.',
  'Press 1 for Electricity.',
  'Press 2 for Water Supply.',
  'Press 3 for Sanitation.',
  'Press 4 for Roads.',
  'Press 5 for Public Safety.',
  'Press 9 to mark as urgent.',
  'Press # to create ticket.',
];

function buildTicket(category, priority) {
  const ticketId = 'CT-TKT-2026-IVR001';
  const resolvedCategory = category || 'General Civic Issue';
  const isUrgent = priority === 'Critical/Urgent';

  return {
    ticketId,
    complaintId: 'CT-2026-IVR001',
    source: 'Phone IVR',
    category: resolvedCategory,
    department: `${resolvedCategory} Department`,
    priority: isUrgent ? 'Critical' : 'Medium',
    status: 'Registered',
    sla: isUrgent ? '4 hours' : '24 hours',
    assignedOfficer: isUrgent ? 'Priority Control Desk' : 'Ward Helpdesk',
    officerRole: isUrgent ? 'Critical Triage Officer' : 'Citizen Service Operator',
    ward: 'Ward Pending',
    zone: 'Phone Intake',
    submittedAt: new Date().toISOString(),
    trackingUrl: `${window.location.origin}/track-ticket?ticket=${ticketId}`,
  };
}

export default function IVRDemo() {
  const shouldReduceMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [screenMessage, setScreenMessage] = useState('Welcome to CivicTrust AI grievance helpline.');
  const [ticket, setTicket] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleKeyPress = (key) => {
    if (!key) return;

    if (categoryByKey[key]) {
      setSelectedCategory(categoryByKey[key]);
      setScreenMessage(`Selected category: ${categoryByKey[key]}`);
      return;
    }

    if (key === '9') {
      setPriority('Critical/Urgent');
      setScreenMessage('Priority marked as Critical/Urgent');
      return;
    }

    if (key === '#') {
      const nextTicket = buildTicket(selectedCategory, priority);
      setTicket(nextTicket);
      setScreenMessage(`Ticket generated: ${nextTicket.ticketId}`);
      return;
    }

    setScreenMessage(`Key ${key} received. Choose 1-5, 9, or #.`);
  };

  const handleCopy = () => {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.ticketId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setPriority('Normal');
    setScreenMessage('Welcome to CivicTrust AI grievance helpline.');
    setTicket(null);
    setCopied(false);
  };

  return (
    <div className="page-wrapper page-shell app-warm-bg">
      <Navbar />
      <main className="container page-content" style={{ maxWidth: '1180px' }}>
        <motion.section
          className="animate-page-hero"
          variants={heroReveal}
          {...pageRevealProps(shouldReduceMotion)}
          style={{ textAlign: 'center', marginBottom: '2.5rem' }}
        >
          <div className="badge badge-ai" style={{ marginBottom: '1rem' }}>
            <PhoneCall size={14} /> Channel Prototype
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            CivicTrust Phone IVR Demo
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '1.05rem' }}>
            Demo simulation only — real IVR/telecom integration can be added later.
          </p>
        </motion.section>

        <div style={{ display: 'grid', gridTemplateColumns: ticket ? 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' : 'minmax(0, 420px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
          <motion.section className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)}>
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '2rem', maxWidth: '430px', margin: '0 auto', border: '1px solid rgba(30,58,138,0.16)' }}>
              <div style={{ background: 'linear-gradient(180deg, #0f172a, #1e293b)', borderRadius: '1.6rem', padding: '1rem', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
                <div style={{ height: '360px', borderRadius: '1.2rem', background: 'linear-gradient(180deg, #f8fafc, #ecfeff)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>CivicTrust IVR</span>
                      <Volume2 size={18} color="var(--ai-teal)" />
                    </div>
                    <p style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.45 }}>
                      {screenMessage}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(226,232,240,0.9)' }}>
                      <div>
                        <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--on-surface-variant)' }}>Category</p>
                        <p style={{ fontWeight: 800, color: 'var(--primary)' }}>{selectedCategory || 'Not selected'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--on-surface-variant)' }}>Priority</p>
                        <p style={{ fontWeight: 800, color: priority === 'Critical/Urgent' ? '#dc2626' : 'var(--ai-teal)' }}>{priority}</p>
                      </div>
                    </div>

                    {ticket && (
                      <div style={{ padding: '0.85rem', borderRadius: '1rem', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
                        <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--on-surface-variant)' }}>Generated ticket</p>
                        <p style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>{ticket.ticketId}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ paddingTop: '1rem', display: 'grid', gap: '0.65rem' }}>
                  {keypadRows.map((row, rowIndex) => (
                    <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                      {row.map((key, index) => key ? (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleKeyPress(key)}
                          className="premium-button-hover"
                          style={{ height: '3.25rem', borderRadius: '1rem', background: key === '#' ? 'var(--ai-teal)' : 'rgba(255,255,255,0.92)', color: key === '#' ? 'white' : '#0f172a', fontSize: '1.25rem', fontWeight: 900, boxShadow: '0 12px 26px -20px rgba(0,0,0,0.7)' }}
                        >
                          {key}
                        </button>
                      ) : (
                        <div key={`empty-${index}`} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)}>
            <div className="glass-card" style={{ padding: '2rem', height: '100%' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.35rem', fontWeight: 900, marginBottom: '1.25rem' }}>
                <PhoneCall size={22} color="var(--primary)" /> IVR script
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {scriptLines.map((line) => (
                  <div key={line} style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(226,232,240,0.76)', fontWeight: 650, color: 'var(--on-surface)' }}>
                    {line}
                  </div>
                ))}
              </div>

              {ticket ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button type="button" onClick={handleCopy} className="btn btn-outline premium-button-hover" style={{ borderRadius: 'var(--radius-full)' }}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Ticket ID'}
                  </button>
                  <Link to={`/track-ticket?ticket=${ticket.ticketId}`} className="btn btn-primary civic-gradient-button premium-button-hover" style={{ borderRadius: 'var(--radius-full)' }}>
                    Track Ticket <ArrowRight size={16} />
                  </Link>
                  <button type="button" onClick={handleReset} className="btn btn-outline premium-button-hover" style={{ borderRadius: 'var(--radius-full)' }}>
                    <RotateCcw size={16} /> Reset IVR
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7 }}>
                  Choose a category with keys 1-5, press 9 if urgent, then press # to create a demo ticket.
                </p>
              )}
            </div>
          </motion.section>

          {ticket && (
            <motion.section className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)} style={{ gridColumn: '1 / -1' }}>
              <TicketReceipt {...ticket} />
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
}
