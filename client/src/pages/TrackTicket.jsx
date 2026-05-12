import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TicketReceipt from '../components/citizen/TicketReceipt';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';

const DEMO_TICKETS = {
  'CT-TKT-2026-0001': {
    ticketId: 'CT-TKT-2026-0001',
    complaintId: 'CT-2026-0001',
    source: 'Web',
    category: 'Electricity',
    department: 'Electricity Department',
    priority: 'Critical',
    status: 'Field Team Dispatch Pending',
    sla: '4 hours',
    assignedOfficer: 'Rahul Verma',
    officerRole: 'Ward Electricity Officer',
    ward: 'Ward 1',
    zone: 'North',
    submittedAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(), // 47 mins ago
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/track-ticket?ticket=CT-TKT-2026-0001`,
    timeline: [
      { label: 'Ticket Created',              done: true,  time: '47 mins ago' },
      { label: 'AI Classified',               done: true,  time: '46 mins ago' },
      { label: 'SLA Assigned',                done: true,  time: '46 mins ago' },
      { label: 'Officer Assigned',            done: true,  time: '45 mins ago' },
      { label: 'Field Team Dispatch Pending', done: false, time: 'In progress' },
      { label: 'Resolution Awaited',          done: false, time: '--' },
    ],
  },
  'CT-TKT-2026-0002': {
    ticketId: 'CT-TKT-2026-0002',
    complaintId: 'CT-2026-0002',
    source: 'Web',
    category: 'Water Supply',
    department: 'Water Authority',
    priority: 'High',
    status: 'Officer Assigned',
    sla: '8 hours',
    assignedOfficer: 'Neha Sharma',
    officerRole: 'Water Supply Engineer',
    ward: 'Ward 1',
    zone: 'North',
    submittedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/track-ticket?ticket=CT-TKT-2026-0002`,
    timeline: [
      { label: 'Ticket Created',              done: true,  time: '2 hours ago' },
      { label: 'AI Classified',               done: true,  time: '2 hours ago' },
      { label: 'SLA Assigned',                done: true,  time: '2 hours ago' },
      { label: 'Officer Assigned',            done: true,  time: '1h 55m ago' },
      { label: 'Field Team Dispatch Pending', done: false, time: '--' },
      { label: 'Resolution Awaited',          done: false, time: '--' },
    ],
  },
  'CT-TKT-2026-0003': {
    ticketId: 'CT-TKT-2026-0003',
    complaintId: 'CT-2026-0003',
    source: 'Web',
    category: 'Sanitation & Waste',
    department: 'Sanitation',
    priority: 'Medium',
    status: 'AI Classified',
    sla: '24 hours',
    assignedOfficer: 'Amit Sharma',
    officerRole: 'Sanitation Inspector',
    ward: 'Ward 2',
    zone: 'Central',
    submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/track-ticket?ticket=CT-TKT-2026-0003`,
    timeline: [
      { label: 'Ticket Created',              done: true,  time: '15 mins ago' },
      { label: 'AI Classified',               done: true,  time: '14 mins ago' },
      { label: 'SLA Assigned',                done: false, time: 'In progress' },
      { label: 'Officer Assigned',            done: false, time: '--' },
      { label: 'Field Team Dispatch Pending', done: false, time: '--' },
      { label: 'Resolution Awaited',          done: false, time: '--' },
    ],
  },
  'CT-TKT-2026-WA001': {
    ticketId: 'CT-TKT-2026-WA001',
    complaintId: 'CT-2026-WA001',
    source: 'WhatsApp',
    category: 'Electricity',
    department: 'Electricity Department',
    priority: 'Critical',
    status: 'Field Team Dispatch Pending',
    sla: '4 hours',
    assignedOfficer: 'Rahul Verma',
    officerRole: 'Ward Electricity Officer',
    ward: 'Ward 1',
    zone: 'North',
    submittedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/track-ticket?ticket=CT-TKT-2026-WA001`,
    timeline: [
      { label: 'Ticket Created',              done: true,  time: '6 mins ago' },
      { label: 'AI Classified',               done: true,  time: '5 mins ago' },
      { label: 'SLA Assigned',                done: true,  time: '5 mins ago' },
      { label: 'Officer Assigned',            done: true,  time: '4 mins ago' },
      { label: 'Field Team Dispatch Pending', done: false, time: 'In progress' },
      { label: 'Resolution Awaited',          done: false, time: '--' },
    ],
  },
  'CT-TKT-2026-IVR001': {
    ticketId: 'CT-TKT-2026-IVR001',
    complaintId: 'CT-2026-IVR001',
    source: 'Phone IVR',
    category: 'Public Safety',
    department: 'Public Safety Department',
    priority: 'Critical',
    status: 'Registered',
    sla: '4 hours',
    assignedOfficer: 'Priority Control Desk',
    officerRole: 'Critical Triage Officer',
    ward: 'Ward Pending',
    zone: 'Phone Intake',
    submittedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    trackingUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/track-ticket?ticket=CT-TKT-2026-IVR001`,
    timeline: [
      { label: 'Ticket Created',     done: true,  time: '3 mins ago' },
      { label: 'AI Classified',      done: true,  time: '2 mins ago' },
      { label: 'SLA Assigned',       done: true,  time: '2 mins ago' },
      { label: 'Officer Assigned',   done: false, time: 'In progress' },
      { label: 'Resolution Awaited', done: false, time: '--' },
    ],
  },
};

const DEMO_IDS = Object.keys(DEMO_TICKETS);

export default function TrackTicket() {
  const [searchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState(searchParams.get('ticket') || '');
  const [searched, setSearched] = useState(!!searchParams.get('ticket'));
  const [result, setResult] = useState(searchParams.get('ticket') ? DEMO_TICKETS[searchParams.get('ticket')] || null : null);

  const handleSearch = (e) => {
    e.preventDefault();
    const key = query.trim().toUpperCase();
    setResult(DEMO_TICKETS[key] || null);
    setSearched(true);
  };

  return (
    <div className="page-wrapper page-shell app-warm-bg">
      <Navbar />
      <div className="container page-content" style={{ maxWidth: '900px' }}>

        <motion.div className="animate-page-hero" variants={heroReveal} {...pageRevealProps(shouldReduceMotion)} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="badge badge-ai" style={{ marginBottom: '1rem' }}>Transparent Ticket Status</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem', color: 'var(--on-surface)' }}>Track Your Ticket</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)' }}>
            Enter your Ticket ID to see SLA, officer assignment, and current progress.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center' }}>Demo IDs:</span>
            {DEMO_IDS.map(id => (
              <button
                key={id}
                onClick={() => { setQuery(id); setResult(DEMO_TICKETS[id]); setSearched(true); }}
                className="premium-button-hover"
                style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(254,215,170,0.8)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.target.style.background = 'var(--surface-container-high)'}
                onMouseLeave={e => e.target.style.background = 'var(--surface-container)'}
              >
                {id}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Search */}
        <motion.form className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)} onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '4rem', maxWidth: '600px', margin: '0 auto 4rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Enter Ticket ID (e.g. CT-TKT-2026-0001)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '3rem', paddingRight: '1rem', fontSize: '1.125rem', borderRadius: 'var(--radius-xl)', height: '3.5rem', boxShadow: 'var(--shadow-sm)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary civic-gradient-button premium-button-hover" style={{ borderRadius: 'var(--radius-xl)', padding: '0 2rem', fontWeight: 700 }}>Track</button>
        </motion.form>

        <AnimatePresence mode="wait">
          {searched && result && (
            <motion.div key="found" initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* SLA alert */}
              {result.priority === 'Critical' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Ticket Status: <span style={{ color: '#ef4444' }}>Critical — {result.sla} SLA active</span></p>
                </div>
              )}

              {/* Timeline */}
              <div className="glass-card premium-card-hover" style={{ padding: '2.5rem', marginBottom: '2rem', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--on-surface)' }}>
                  <Clock size={24} color="var(--primary)" /> Resolution Timeline
                </h3>
                <div className="timeline">
                  {result.timeline.map((step, i) => (
                    <div key={i} className={`timeline-item ${step.done ? (i === result.timeline.filter(s => s.done).length - 1 ? 'active' : 'success') : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {step.done
                            ? <CheckCircle2 size={20} color="#10b981" />
                            : <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--outline)', flexShrink: 0 }} />
                          }
                          <span style={{ fontSize: '1rem', fontWeight: step.done ? 700 : 500, color: step.done ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                            {step.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--outline)', whiteSpace: 'nowrap', fontWeight: 600 }}>{step.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <TicketReceipt {...result} />
            </motion.div>
          )}

          {searched && !result && (
            <motion.div key="notfound" initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Search size={32} color="var(--outline)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>No Ticket Found</h3>
              <p style={{ color: 'var(--on-surface-variant)' }}>Please check your Ticket ID and try again. Demo IDs: {DEMO_IDS.join(', ')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
