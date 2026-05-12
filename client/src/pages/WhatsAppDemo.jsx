import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, MessageCircle, Send, ShieldAlert, Ticket } from 'lucide-react';
import Navbar from '../components/Navbar';
import TicketReceipt from '../components/citizen/TicketReceipt';
import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';

const WA_TICKET_ID = 'CT-TKT-2026-WA001';

const TRACK_STATUSES = {
  'CT-TKT-2026-0001': {
    category: 'Electricity',
    priority: 'Critical',
    status: 'Field Team Dispatch Pending',
    sla: '4 hours',
  },
  [WA_TICKET_ID]: {
    category: 'Electricity',
    priority: 'Critical',
    status: 'Field Team Dispatch Pending',
    sla: '4 hours',
  },
};

const quickButtons = ['File Complaint', 'Track Ticket', 'Emergency Issue', 'QR Zone Help'];

const initialMessages = [
  {
    id: 'welcome',
    from: 'bot',
    text: 'Welcome to CivicTrust AI. Send your complaint or choose an option.',
  },
];

function makeTicket({ category = 'Electricity', priority = 'Critical', sla = '4 hours' } = {}) {
  const ticketId = WA_TICKET_ID;

  return {
    ticketId,
    complaintId: 'CT-2026-WA001',
    source: 'WhatsApp',
    category,
    department: `${category} Department`,
    priority,
    status: 'Field Team Dispatch Pending',
    sla,
    assignedOfficer: 'Rahul Verma',
    officerRole: 'Ward Electricity Officer',
    ward: 'Ward 1',
    zone: 'North',
    submittedAt: new Date().toISOString(),
    trackingUrl: `${window.location.origin}/track-ticket?ticket=${ticketId}`,
  };
}

function detectComplaint(text) {
  const lower = text.toLowerCase();
  let category = 'General Civic Issue';
  let priority = 'Medium';
  let sla = '24 hours';

  if (/(bijli|electric|pole|spark|wire|transformer|power|light)/i.test(lower)) {
    category = 'Electricity';
  } else if (/(water|paani|pipe|leak|supply)/i.test(lower)) {
    category = 'Water Supply';
  } else if (/(garbage|kachra|drain|sewer|sanitation)/i.test(lower)) {
    category = 'Sanitation';
  } else if (/(road|pothole|street|gadda)/i.test(lower)) {
    category = 'Roads';
  }

  if (/(spark|fire|danger|urgent|emergency|unsafe|exposed|accident)/i.test(lower)) {
    priority = 'Critical';
    sla = '4 hours';
  } else if (/(leak|blocked|broken|overflow)/i.test(lower)) {
    priority = 'High';
    sla = '8 hours';
  }

  return { category, priority, sla };
}

function isComplaintLike(text) {
  const lower = text.toLowerCase();
  return (
    text.trim().length > 14 &&
    /(bijli|electric|pole|spark|water|paani|garbage|kachra|road|pothole|drain|sewer|light|wire|supply|safety|unsafe|near|paas)/i.test(lower)
  );
}

export default function WhatsAppDemo() {
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [pendingTicket, setPendingTicket] = useState(null);
  const [createdTicket, setCreatedTicket] = useState(null);

  const messageCount = useMemo(() => messages.length, [messages]);

  const appendMessages = (...nextMessages) => {
    setMessages((prev) => [
      ...prev,
      ...nextMessages.map((message, index) => ({
        id: `${Date.now()}-${index}-${prev.length}`,
        ...message,
      })),
    ]);
  };

  const handleTrackStatus = (rawText) => {
    const match = rawText.toUpperCase().match(/CT-TKT-2026-[A-Z0-9]+/);
    const ticketId = match?.[0];
    const status = ticketId ? TRACK_STATUSES[ticketId] : null;

    if (!ticketId) {
      appendMessages({
        from: 'bot',
        text: 'Send a demo tracking message like: track CT-TKT-2026-0001',
      });
      return;
    }

    if (!status) {
      appendMessages({
        from: 'bot',
        text: `No demo status found for ${ticketId}. Try CT-TKT-2026-0001 or ${WA_TICKET_ID}.`,
      });
      return;
    }

    appendMessages({
      from: 'bot',
      type: 'status',
      ticketId,
      ...status,
    });
  };

  const handleUserText = (rawText) => {
    const text = rawText.trim();
    if (!text) return;

    appendMessages({ from: 'user', text });

    if (/^yes$/i.test(text) && pendingTicket) {
      const ticket = pendingTicket;
      setCreatedTicket(ticket);
      setPendingTicket(null);
      appendMessages({
        from: 'bot',
        type: 'created',
        ticketId: ticket.ticketId,
        status: ticket.status,
      });
      return;
    }

    if (/^track\s+/i.test(text)) {
      handleTrackStatus(text);
      return;
    }

    if (isComplaintLike(text)) {
      const detected = detectComplaint(text);
      const ticket = makeTicket(detected);
      setPendingTicket(ticket);
      appendMessages({
        from: 'bot',
        type: 'analysis',
        ticketId: ticket.ticketId,
        ...detected,
      });
      return;
    }

    appendMessages({
      from: 'bot',
      text: 'Type a short civic issue, or send: track CT-TKT-2026-0001',
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleUserText(input);
    setInput('');
  };

  const handleQuickButton = (label) => {
    appendMessages({ from: 'user', text: label });

    if (label === 'File Complaint') {
      appendMessages({
        from: 'bot',
        text: 'Type your complaint in one message. Example: School ke paas bijli ka pole spark kar raha hai',
      });
      return;
    }

    if (label === 'Track Ticket') {
      appendMessages({
        from: 'bot',
        text: 'Send a demo tracking message like: track CT-TKT-2026-0001',
      });
      return;
    }

    if (label === 'Emergency Issue') {
      appendMessages({
        from: 'bot',
        text: 'Demo only: describe the civic safety issue and CivicTrust will mark it Critical. This is not connected to any emergency service.',
      });
      return;
    }

    appendMessages({
      from: 'bot',
      text: 'QR Zone reporting adds location context from a ward poster.',
      action: { label: 'Open QR Zones', to: '/qr-zones' },
    });
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
            <MessageCircle size={14} /> Channel Prototype
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            CivicTrust WhatsApp Complaint Demo
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '1.05rem' }}>
            Demo simulation only — real WhatsApp API can be integrated later.
          </p>
        </motion.section>

        <div style={{ display: 'grid', gridTemplateColumns: createdTicket ? 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' : 'minmax(0, 760px)', justifyContent: 'center', gap: '1.5rem', alignItems: 'start' }}>
          <motion.section
            className="animate-card"
            variants={cardReveal}
            {...pageRevealProps(shouldReduceMotion)}
          >
            <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '1.5rem', border: '1px solid rgba(18,140,126,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'linear-gradient(90deg, #e8f8f3, #ffffff)', borderBottom: '1px solid rgba(18,140,126,0.14)' }}>
                <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: '#128c7e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>CivicTrust AI</h2>
                  <p style={{ color: '#128c7e', fontSize: '0.8125rem', fontWeight: 700 }}>Demo chatbot active</p>
                </div>
                <span className="badge" style={{ background: 'rgba(18,140,126,0.1)', color: '#128c7e' }}>{messageCount} messages</span>
              </div>

              <div style={{ minHeight: '470px', maxHeight: '560px', overflowY: 'auto', padding: '1.25rem', background: 'linear-gradient(180deg, rgba(240,253,250,0.72), rgba(255,247,237,0.45))' }}>
                {messages.map((message) => {
                  const isUser = message.from === 'user';

                  return (
                    <div key={message.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.8rem' }}>
                      <div
                        style={{
                          maxWidth: '82%',
                          padding: '0.85rem 1rem',
                          borderRadius: isUser ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
                          background: isUser ? '#dcf8c6' : 'rgba(255,255,255,0.92)',
                          border: isUser ? '1px solid rgba(18,140,126,0.16)' : '1px solid rgba(226,232,240,0.72)',
                          boxShadow: '0 10px 24px -18px rgba(15,23,42,0.22)',
                          color: 'var(--on-surface)',
                        }}
                      >
                        {message.type === 'analysis' ? (
                          <div>
                            <p style={{ fontWeight: 800, marginBottom: '0.65rem' }}>Complaint understood.</p>
                            <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
                              <span>Category: <strong>{message.category}</strong></span>
                              <span>Priority: <strong style={{ color: '#dc2626' }}>{message.priority}</strong></span>
                              <span>SLA: <strong>{message.sla}</strong></span>
                              <span>Suggested ticket: <strong>{message.ticketId}</strong></span>
                            </div>
                            <p style={{ marginTop: '0.75rem', fontWeight: 700 }}>Reply YES to create this ticket.</p>
                          </div>
                        ) : message.type === 'created' ? (
                          <div>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#047857', marginBottom: '0.5rem' }}>
                              <CheckCircle2 size={18} /> Ticket created successfully.
                            </p>
                            <p>Ticket ID: <strong>{message.ticketId}</strong></p>
                            <p>Status: <strong>{message.status}</strong></p>
                            <Link
                              to={`/track-ticket?ticket=${message.ticketId}`}
                              className="btn btn-primary btn-sm premium-button-hover"
                              style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-full)' }}
                            >
                              Track Ticket <ArrowRight size={14} />
                            </Link>
                          </div>
                        ) : message.type === 'status' ? (
                          <div>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                              <Ticket size={17} /> Demo ticket status
                            </p>
                            <p>Ticket ID: <strong>{message.ticketId}</strong></p>
                            <p>Category: <strong>{message.category}</strong></p>
                            <p>Priority: <strong>{message.priority}</strong></p>
                            <p>Status: <strong>{message.status}</strong></p>
                            <p>SLA: <strong>{message.sla}</strong></p>
                          </div>
                        ) : (
                          <div>
                            <p>{message.text}</p>
                            {message.action && (
                              <Link to={message.action.to} className="btn btn-outline btn-sm premium-button-hover" style={{ marginTop: '0.7rem', borderRadius: 'var(--radius-full)' }}>
                                {message.action.label}
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.84)', borderTop: '1px solid rgba(226,232,240,0.76)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {quickButtons.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleQuickButton(label)}
                      className="btn btn-outline btn-sm premium-button-hover"
                      style={{ borderRadius: 'var(--radius-full)', color: label === 'Emergency Issue' ? '#c2410c' : undefined }}
                    >
                      {label === 'Emergency Issue' && <ShieldAlert size={14} />}
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.65rem' }}>
                  <input
                    className="form-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Type a complaint or track CT-TKT-2026-0001"
                    style={{ borderRadius: 'var(--radius-full)', minHeight: '3rem' }}
                  />
                  <button type="submit" className="btn btn-primary premium-button-hover" style={{ width: '3rem', height: '3rem', padding: 0, borderRadius: '50%' }} title="Send message">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </motion.section>

          {createdTicket && (
            <motion.aside
              className="animate-card"
              variants={cardReveal}
              {...pageRevealProps(shouldReduceMotion)}
            >
              <TicketReceipt {...createdTicket} />
            </motion.aside>
          )}
        </div>
      </main>
    </div>
  );
}
