import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, MessageCircle, Send, ShieldAlert, Ticket } from 'lucide-react';
import Navbar from '../components/Navbar';
import TicketReceipt from '../components/citizen/TicketReceipt';
import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';

const WA_TICKET_ID = 'CT-TKT-2026-WA001';
const PRIMARY_DEMO_TICKET_ID = 'CT-TKT-2026-0001';
const FILE_GRIEVANCE_PATH = '/new-grievance';

const SCOPED_FALLBACK =
  "I'm CivicTrust WhatsApp Bot. I can only help with civic grievance filing, ticket tracking, emergency civic issues, QR zone reporting, SLA, and complaint guidance. Please send a civic complaint or choose an option.";

const MENU_REPLY = 'Please choose an option:\n1. File Complaint\n2. Track Ticket\n3. Emergency Issue\n4. QR Zone Help\n5. SLA Help';

const TRACK_STATUSES = {
  [PRIMARY_DEMO_TICKET_ID]: {
    category: 'Electricity',
    priority: 'Critical',
    status: 'Field Team Dispatch Pending',
    sla: '4 hours',
    assignedOfficer: 'Rahul Verma',
    ward: 'Ward 1 North',
  },
  [WA_TICKET_ID]: {
    category: 'Electricity',
    priority: 'Critical',
    status: 'Field Team Dispatch Pending',
    sla: '4 hours',
    assignedOfficer: 'Rahul Verma',
    ward: 'Ward 1 North',
  },
};

const quickButtons = ['File Complaint', 'Track Ticket', 'Emergency Issue', 'QR Zone Help', 'SLA Help'];

const quickButtonMessages = {
  'File Complaint': 'file complaint',
  'Track Ticket': `track ${PRIMARY_DEMO_TICKET_ID}`,
  'Emergency Issue': 'emergency issue',
  'QR Zone Help': 'qr zone help',
  'SLA Help': 'what is critical SLA',
};

const initialMessages = [
  {
    id: 'welcome',
    from: 'bot',
    text: 'Welcome to CivicTrust AI WhatsApp Demo. Send your civic complaint or choose an option.',
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

const complaintCategories = [
  {
    category: 'Electricity',
    keywords: ['bijli', 'electricity', 'power', 'wire', 'pole', 'spark', 'current', 'transformer', 'light'],
  },
  {
    category: 'Water',
    keywords: ['pani', 'paani', 'water', 'pipeline', 'tap', 'leakage', 'dirty water', 'contaminated', 'supply'],
  },
  {
    category: 'Sanitation',
    keywords: ['kachra', 'garbage', 'waste', 'gandagi', 'drain', 'nala', 'sewage', 'cleaning'],
  },
  {
    category: 'Roads',
    keywords: ['road', 'sadak', 'pothole', 'gaddha', 'gadda', 'bridge', 'footpath', 'traffic', 'waterlogging'],
  },
  {
    category: 'Public Safety',
    keywords: ['fire', 'accident', 'danger', 'injury', 'collapse', 'open manhole', 'school', 'hospital', 'emergency'],
  },
];

const emergencyKeywords = ['fire', 'shock', 'current', 'spark', 'accident', 'injury', 'collapse', 'open manhole', 'danger', 'school', 'hospital'];
const highPriorityKeywords = ['leakage', 'dirty water', 'contaminated', 'sewage', 'waterlogging', 'blocked', 'overflow'];

const outOfScopeRules = [
  { reason: 'Java', test: (text) => /\bjava\b/.test(text) },
  { reason: 'programming', test: (text) => /\b(python|javascript|coding|programming|algorithm|database|html|css|react|node)\b/.test(text) },
  { reason: 'poem', test: (text) => /\b(poem|poetry|shayari)\b/.test(text) },
  { reason: 'joke', test: (text) => /\b(joke|funny story)\b/.test(text) },
  { reason: 'Virat Kohli', test: (text) => /\b(virat|kohli)\b/.test(text) },
  { reason: 'math', test: (text) => /\b2\s*\+\s*2\b/.test(text) || (/\bsolve\b/.test(text) && /\b(math|equation|sum|problem)\b|\d+\s*[+\-*\/]\s*\d+/.test(text)) },
  { reason: 'general knowledge', test: (text) => /\b(who is|capital of|history of|weather|latest news|wikipedia)\b/.test(text) },
];

function normalizeMessage(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyWhatsAppComplaint(message) {
  const text = normalizeMessage(message);
  const wordCount = text.split(' ').filter(Boolean).length;
  const matched = complaintCategories.find((group) => includesAny(text, group.keywords));

  if (!matched || (text.length < 8 && wordCount < 2)) return null;

  const isCritical = matched.category === 'Public Safety' || includesAny(text, emergencyKeywords);
  const isHighPriority = includesAny(text, highPriorityKeywords);
  const priority = isCritical ? 'Critical' : isHighPriority ? 'High' : 'Medium';
  const sla = isCritical ? '4 hours' : isHighPriority ? '8 hours' : '24 hours';

  let reason = `${matched.category} issue keywords were found in the citizen message.`;

  if (matched.category === 'Electricity' && text.includes('spark') && text.includes('school')) {
    reason = 'Sparking pole near school may be a safety risk.';
  } else if (matched.category === 'Electricity' && includesAny(text, ['spark', 'current', 'wire', 'transformer'])) {
    reason = 'Electrical infrastructure hazard may be a safety risk.';
  } else if (matched.category === 'Water' && includesAny(text, ['dirty water', 'contaminated'])) {
    reason = 'Dirty or contaminated water may affect public health.';
  } else if (matched.category === 'Water') {
    reason = 'Water supply or leakage issue needs utility department attention.';
  } else if (matched.category === 'Sanitation') {
    reason = 'Waste, drain, or sewage issue may affect local hygiene.';
  } else if (matched.category === 'Roads') {
    reason = 'Road or public works issue may affect citizen mobility and safety.';
  } else if (matched.category === 'Public Safety') {
    reason = 'The message includes safety-critical civic risk keywords.';
  }

  return {
    text: message.trim(),
    category: matched.category,
    priority,
    sla,
    reason,
  };
}

function detectOutOfScope(text) {
  return outOfScopeRules.find((rule) => rule.test(text));
}

function extractTicketId(text) {
  return text.match(/CT-TKT-2026-[A-Z0-9]+/i)?.[0]?.toUpperCase() || '';
}

export function detectWhatsAppIntent(message) {
  const text = normalizeMessage(message);

  if (!text) {
    return { allowed: false, intent: 'out_of_scope', reason: 'empty message' };
  }

  if (/^(hi|hello|hey|start)$/.test(text)) {
    return { allowed: true, intent: 'greeting' };
  }

  if (/^(menu|help)$/.test(text)) {
    return { allowed: true, intent: 'menu' };
  }

  if (/^yes$/.test(text)) {
    return { allowed: true, intent: 'confirm_ticket' };
  }

  if (includesAny(text, ['track', 'ticket', 'ct-tkt', 'complaint id', 'ct-2026'])) {
    return { allowed: true, intent: 'track_ticket' };
  }

  if (includesAny(text, ['sla', 'priority', 'critical', 'response time', 'how long', 'timeline'])) {
    return { allowed: true, intent: 'sla_help' };
  }

  if (includesAny(text, ['qr zone', 'qr', 'scan', 'zone help', 'ward poster'])) {
    return { allowed: true, intent: 'qr_help' };
  }

  if (includesAny(text, ['civicdraft', 'draft', 'formal complaint', 'write application', 'complaint writing', 'improve complaint'])) {
    return { allowed: true, intent: 'civicdraft_help' };
  }

  if (includesAny(text, ['department', 'officer', 'ward', 'municipal', 'authority', 'assigned officer', 'routing'])) {
    return { allowed: true, intent: 'department_help' };
  }

  const blocked = detectOutOfScope(text);
  if (blocked) {
    return { allowed: false, intent: 'out_of_scope', reason: blocked.reason };
  }

  if (/^(emergency|emergency issue|emergency help)$/.test(text)) {
    return { allowed: true, intent: 'emergency_help' };
  }

  const complaint = classifyWhatsAppComplaint(message);
  if (complaint) {
    return {
      allowed: true,
      intent: 'complaint_preview',
      category: complaint.category,
      priority: complaint.priority,
      sla: complaint.sla,
      reason: complaint.reason,
    };
  }

  if (includesAny(text, ['file complaint', 'file a complaint', 'new complaint', 'submit complaint', 'lodge complaint', 'report issue', 'report a problem', 'grievance'])) {
    return { allowed: true, intent: 'file_complaint' };
  }

  if (includesAny(text, ['emergency issue', 'emergency help', ...emergencyKeywords])) {
    return { allowed: true, intent: 'emergency_help' };
  }

  return {
    allowed: false,
    intent: 'out_of_scope',
    reason: 'unsupported topic',
  };
}

function buildOutOfScopeReply(intent) {
  if (intent.reason === 'Java') {
    return "I'm CivicTrust WhatsApp Bot. I can't help with Java questions. Please send a civic complaint or choose File Complaint / Track Ticket.";
  }

  if (['poem', 'joke', 'Virat Kohli', 'math', 'programming', 'general knowledge'].includes(intent.reason)) {
    return "I'm CivicTrust WhatsApp Bot. I can only help with civic grievance filing, ticket tracking, QR reporting, SLA, and complaint guidance.";
  }

  return SCOPED_FALLBACK;
}

export default function WhatsAppDemo() {
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [pendingComplaint, setPendingComplaint] = useState(null);
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
    const ticketId = extractTicketId(rawText);
    const status = ticketId ? TRACK_STATUSES[ticketId] : null;

    if (!status) {
      appendMessages({
        from: 'bot',
        text: 'Please enter a valid CivicTrust ticket ID like CT-TKT-2026-0001.',
      });
      return;
    }

    appendMessages({
      from: 'bot',
      type: 'status',
      ticketId,
      ...status,
      action: { label: 'Open Tracking Page', to: `/track-ticket?ticket=${ticketId}` },
    });
  };

  const handleComplaintPreview = (text) => {
    const complaint = classifyWhatsAppComplaint(text);
    setPendingComplaint(complaint);
    appendMessages({
      from: 'bot',
      type: 'analysis',
      ...complaint,
    });
  };

  const handleConfirmTicket = () => {
    if (!pendingComplaint) {
      appendMessages({
        from: 'bot',
        text: 'Please send your civic complaint first, then reply YES to create a ticket.',
      });
      return;
    }

    const ticket = makeTicket(pendingComplaint);
    setCreatedTicket(ticket);
    setPendingComplaint(null);
    appendMessages({
      from: 'bot',
      type: 'created',
      ticketId: ticket.ticketId,
      source: ticket.source,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
    });
  };

  const handleAllowedIntent = (text, intent) => {
    switch (intent.intent) {
      case 'greeting':
      case 'menu':
        appendMessages({ from: 'bot', text: MENU_REPLY });
        return;
      case 'file_complaint':
        appendMessages({
          from: 'bot',
          text: 'Please send your civic complaint in one message. Example: School ke paas bijli ka pole spark kar raha hai',
        });
        return;
      case 'complaint_preview':
        handleComplaintPreview(text);
        return;
      case 'confirm_ticket':
        handleConfirmTicket();
        return;
      case 'track_ticket':
        handleTrackStatus(text);
        return;
      case 'emergency_help':
        appendMessages({
          from: 'bot',
          text: 'This may be a safety-critical civic issue. Please file it immediately. If there is immediate danger to life, contact local emergency services as well.\n\nReply YES to create an emergency grievance ticket if you already described the issue.',
          actions: [
            { label: 'File Complaint', to: FILE_GRIEVANCE_PATH },
            { label: 'QR Zone Help', to: '/qr-zones' },
          ],
        });
        return;
      case 'sla_help':
        appendMessages({
          from: 'bot',
          text: 'Critical SLA in the CivicTrust demo is 4 hours for safety risks such as sparking wires, fire, open manholes, accidents, collapse risk, or danger near a school or hospital. High priority issues use 8 hours, and routine civic issues use 24 hours.',
        });
        return;
      case 'qr_help':
        appendMessages({
          from: 'bot',
          text: 'QR Zone Help: scan a CivicTrust ward QR poster to attach zone, ward, and location context before filing a grievance.',
          action: { label: 'Open QR Zones', to: '/qr-zones' },
        });
        return;
      case 'civicdraft_help':
        appendMessages({
          from: 'bot',
          text: 'CivicDraft helps convert rough civic issue text into a clearer grievance application. In this WhatsApp demo, send the complaint text first and reply YES after the preview.',
          action: { label: 'Open CivicDraft AI', to: '/copilot' },
        });
        return;
      case 'department_help':
        appendMessages({
          from: 'bot',
          text: 'CivicTrust routes civic grievances to the relevant ward department based on category, priority, location, and SLA. Send the complaint text and I will preview the category locally.',
        });
        return;
      default:
        appendMessages({ from: 'bot', text: SCOPED_FALLBACK });
    }
  };

  const handleUserText = (rawText) => {
    const text = rawText.trim();
    if (!text) return;

    appendMessages({ from: 'user', text });
    const intent = detectWhatsAppIntent(text);

    if (!intent.allowed) {
      appendMessages({ from: 'bot', text: buildOutOfScopeReply(intent) });
      return;
    }

    handleAllowedIntent(text, intent);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleUserText(input);
    setInput('');
  };

  const handleQuickButton = (label) => {
    handleUserText(quickButtonMessages[label]);
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
            Demo simulation only - real WhatsApp API can be integrated later.
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
                            <p style={{ fontWeight: 800, marginBottom: '0.65rem' }}>Complaint detected:</p>
                            <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
                              <span>Category: <strong>{message.category}</strong></span>
                              <span>Priority: <strong style={{ color: '#dc2626' }}>{message.priority}</strong></span>
                              <span>SLA: <strong>{message.sla}</strong></span>
                              <span>Reason: <strong>{message.reason}</strong></span>
                            </div>
                            <p style={{ marginTop: '0.75rem', fontWeight: 700 }}>Reply YES to create a demo ticket.</p>
                          </div>
                        ) : message.type === 'created' ? (
                          <div>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#047857', marginBottom: '0.5rem' }}>
                              <CheckCircle2 size={18} /> Ticket created successfully.
                            </p>
                            <p>Ticket ID: <strong>{message.ticketId}</strong></p>
                            <p>Source: <strong>{message.source}</strong></p>
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
                              <Ticket size={17} /> Ticket found:
                            </p>
                            <p>Status: <strong>{message.status}</strong></p>
                            <p>Priority: <strong>{message.priority}</strong></p>
                            <p>SLA: <strong>{message.sla}</strong></p>
                            <p>Assigned Officer: <strong>{message.assignedOfficer}</strong></p>
                            <p>Ward: <strong>{message.ward}</strong></p>
                            {message.action && (
                              <Link
                                to={message.action.to}
                                className="btn btn-primary btn-sm premium-button-hover"
                                style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-full)' }}
                              >
                                {message.action.label} <ArrowRight size={14} />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p style={{ whiteSpace: 'pre-line' }}>{message.text}</p>
                            {message.action && (
                              <Link to={message.action.to} className="btn btn-outline btn-sm premium-button-hover" style={{ marginTop: '0.7rem', borderRadius: 'var(--radius-full)' }}>
                                {message.action.label}
                              </Link>
                            )}
                            {message.actions && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
                                {message.actions.map((action) => (
                                  <Link key={action.label} to={action.to} className="btn btn-outline btn-sm premium-button-hover" style={{ borderRadius: 'var(--radius-full)' }}>
                                    {action.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.84)', borderTop: '1px solid rgba(226,232,240,0.76)' }}>
                <p style={{ fontSize: '0.76rem', color: 'var(--on-surface-variant)', margin: '0 0 0.75rem', lineHeight: 1.45 }}>
                  Demo bot only handles civic grievance filing, tracking, SLA, QR and emergency guidance.
                </p>
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
