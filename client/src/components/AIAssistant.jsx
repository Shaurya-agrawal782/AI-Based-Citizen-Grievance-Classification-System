import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, ChevronRight, MessageCircle, Minus, Send, ShieldAlert, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const FILE_GRIEVANCE_PATH = '/new-grievance';
const DEMO_TICKET_ID = 'CT-TKT-2026-0001';

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    text: '👋 Hi, I\'m CivicTrust Assistant. I can only help with civic grievances, tickets, QR reporting, SLA info, and complaint writing. What civic issue can I help you with?',
    actions: [
      { label: 'File Complaint', to: FILE_GRIEVANCE_PATH },
      { label: 'Track Demo Ticket', to: `/track-ticket?ticket=${DEMO_TICKET_ID}` },
    ],
  },
];

const quickActions = [
  'File Complaint',
  'Track Ticket',
  'QR Zones',
  'CivicDraft AI',
  'Emergency Help',
];

const promptChips = [
  'How do I file a complaint?',
  `Track ${DEMO_TICKET_ID}`,
  'What is Critical SLA?',
  'Use QR Zone',
  'Write formal application',
];

const demoTicketReply = {
  text: 'Ticket CT-TKT-2026-0001 is currently Field Team Dispatch Pending.\nPriority: Critical\nSLA: 4 hours\nAssigned Officer: Rahul Verma\nWard: Ward 1 North',
  actions: [{ label: 'Open Tracking Page', to: `/track-ticket?ticket=${DEMO_TICKET_ID}` }],
};

const keywordGroups = [
  {
    category: 'Electricity',
    keywords: ['bijli', 'electricity', 'power', 'wire', 'pole', 'spark', 'current', 'shock'],
    defaultPriority: 'High',
    defaultSla: '24-hour SLA',
    reason: 'the complaint mentions electrical infrastructure that may need fast field inspection',
  },
  {
    category: 'Water Supply',
    keywords: ['pani', 'water', 'leakage', 'pipeline', 'pipe', 'supply'],
    defaultPriority: 'High',
    defaultSla: '24-hour SLA',
    reason: 'the complaint mentions water supply or leakage impact',
  },
  {
    category: 'Sanitation',
    keywords: ['kachra', 'garbage', 'drain', 'nala', 'waste', 'sewer'],
    defaultPriority: 'Medium',
    defaultSla: '72-hour SLA',
    reason: 'the complaint mentions waste, drains, or sanitation conditions',
  },
  {
    category: 'Public Works',
    keywords: ['road', 'sadak', 'pothole', 'gaddha', 'manhole'],
    defaultPriority: 'Medium',
    defaultSla: '72-hour SLA',
    reason: 'the complaint mentions road or public works maintenance',
  },
];

const safetyKeywords = ['fire', 'accident', 'danger', 'school', 'hospital', 'open manhole', 'injury', 'collapse', 'shock', 'current', 'spark'];

function normalize(value) {
  return value.toLowerCase().trim();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

// OUT-OF-SCOPE DETECTION - Explicit blocklist for non-civic queries
const OUT_OF_SCOPE_PATTERNS = {
  homework: ['solve', 'answer', 'question', 'math', '2+2', 'equation', 'homework', 'assignment', 'chemistry', 'physics'],
  entertainment: ['joke', 'poem', 'movie', 'song', 'music', 'celebrity', 'virat kohli', 'actor', 'singer', 'sports', 'cricket', 'football'],
  tech_general: ['java', 'python', 'javascript', 'coding', 'programming', 'algorithm', 'database', 'html', 'css', 'react', 'node', 'code'],
  personal_advice: ['love', 'relationship', 'dating', 'marriage', 'advice', 'career', 'job search', 'resume'],
  general_knowledge: ['weather', 'news', 'capital of', 'history of', 'tell me about', 'wikipedia', 'google'],
  political: ['politics', 'election', 'government policy', 'minister', 'political party'],
};

// CIVIC INTENT KEYWORDS
const CIVIC_KEYWORDS = {
  file_complaint: ['file complaint', 'file a complaint', 'new complaint', 'submit complaint', 'grievance', 'report issue', 'report a problem', 'lodge complaint'],
  track_ticket: ['track', 'ticket', 'complaint id', 'ct-tkt', 'ct-2026', 'status', 'tracking'],
  sla_help: ['sla', 'priority', 'urgent', 'critical', 'how long', 'timeline', 'response time'],
  qr_help: ['qr', 'scan', 'zone', 'ward', 'qr code', 'location based'],
  civicdraft_help: ['write application', 'formal complaint', 'application', 'draft', 'copilot', 'civicdraft', 'improve complaint'],
  emergency_help: ['emergency', 'fire', 'shock', 'current', 'accident', 'danger', 'injury', 'collapse', 'open manhole'],
  platform_help: ['how do i', 'how to use', 'how does', 'what is', 'guide', 'help', 'tutorial', 'explain'],
};

// DETECT IF MESSAGE IS OUT OF SCOPE (returns true if out-of-scope)
function isOutOfScope(text) {
  const normalizedText = normalize(text);
  
  // Check all out-of-scope patterns
  for (const [category, keywords] of Object.entries(OUT_OF_SCOPE_PATTERNS)) {
    if (includesAny(normalizedText, keywords)) {
      return { isOutOfScope: true, category };
    }
  }
  
  return { isOutOfScope: false, category: null };
}

// DETECT CIVIC INTENT - returns true if message is civic-related
function hasCivicIntent(text) {
  const normalizedText = normalize(text);
  
  // Check for any civic keywords
  for (const [intent, keywords] of Object.entries(CIVIC_KEYWORDS)) {
    if (includesAny(normalizedText, keywords)) {
      return true;
    }
  }
  
  // Check for complaint preview (looks like actual complaint text)
  const preview = getComplaintPreview(text);
  if (preview) return true;
  
  return false;
}

// CIVIC INTENT DETECTION - comprehensive check
function detectCivicIntent(input) {
  const text = normalize(input);
  
  // First check: is this explicitly out-of-scope?
  const scopeCheck = isOutOfScope(text);
  if (scopeCheck.isOutOfScope) {
    return {
      allowed: false,
      intent: 'out_of_scope',
      reason: `I can't help with ${scopeCheck.category} questions.`,
    };
  }
  
  // Second check: does it have civic intent?
  if (!hasCivicIntent(input)) {
    return {
      allowed: false,
      intent: 'out_of_scope',
      reason: 'This doesn\'t seem related to civic grievances.',
    };
  }
  
  // If not blocked and has civic intent, it's allowed
  return {
    allowed: true,
    intent: 'civic_related',
  };
}

function extractTicketId(text) {
  return text.match(/CT-TKT-\d{4}-\d{4}|CT-\d{4}-\d{4}/i)?.[0]?.toUpperCase() || '';
}

function getComplaintPreview(input) {
  const text = normalize(input);
  const matched = keywordGroups.find((group) => includesAny(text, group.keywords));

  if (!matched || text.length < 10) return null;

  const isSafetyCritical = includesAny(text, safetyKeywords);
  const priority = isSafetyCritical ? 'Critical' : matched.defaultPriority;
  const sla = isSafetyCritical ? '4-hour SLA' : matched.defaultSla;
  const reason = isSafetyCritical
    ? `it mentions a safety risk near a sensitive place or hazardous condition`
    : matched.reason;

  return {
    category: matched.category,
    priority,
    sla,
    reason,
  };
}

function createComplaintPreviewReply(input) {
  const preview = getComplaintPreview(input);
  if (!preview) return null;

  return {
    text: `This looks like a ${preview.category} complaint. Because ${preview.reason}, it may be ${preview.priority} with a ${preview.sla} in the CivicTrust demo.\nSuggested next action: convert this rough text with CivicDraft AI, then file the grievance with location details and any photo evidence.\nWant me to improve this?`,
    actions: [
      { label: 'Convert with CivicDraft AI', to: '/copilot' },
      { label: 'File Complaint', to: FILE_GRIEVANCE_PATH },
      { label: 'QR Zone Reporting', to: '/qr-zones' },
    ],
  };
}

function detectIntent(input) {
  const text = normalize(input);
  
  // FIRST: Check if out-of-scope using civic intent detection
  const intentCheck = detectCivicIntent(input);
  if (!intentCheck.allowed) {
    return {
      text: 'I\'m CivicTrust Assistant, so I can only help with grievance filing, ticket tracking, QR reporting, SLA, priority, complaint writing, and platform guidance. Please ask me about a civic issue or your ticket.',
      actions: [
        { label: 'File Complaint', to: FILE_GRIEVANCE_PATH },
        { label: 'Track Demo Ticket', to: `/track-ticket?ticket=${DEMO_TICKET_ID}` },
      ],
    };
  }
  
  // SECOND: Route to specific intent handlers
  const ticketId = extractTicketId(input);

  if (ticketId || ['track', 'ticket', 'complaint id'].some((term) => text.includes(term))) {
    if (ticketId === DEMO_TICKET_ID || ticketId === 'CT-2026-0001' || text.includes(DEMO_TICKET_ID.toLowerCase())) {
      return demoTicketReply;
    }

    return {
      text: `I can help track CivicTrust demo tickets. Try ${DEMO_TICKET_ID}, or open the tracking page to enter a ticket ID.`,
      actions: [
        { label: 'Track Demo Ticket', to: `/track-ticket?ticket=${DEMO_TICKET_ID}` },
        { label: 'Open Tracking Page', to: '/track-ticket' },
      ],
    };
  }

  if (['emergency', 'fire', 'shock', 'current', 'accident', 'danger', 'injury', 'collapse', 'open manhole'].some((term) => text.includes(term))) {
    return {
      text: 'This may be safety-critical. Please file immediately, and if there is immediate danger to life, contact local emergency services also.',
      actions: [
        { label: 'File Critical Complaint', to: FILE_GRIEVANCE_PATH },
        { label: 'Open QR Zones', to: '/qr-zones' },
      ],
    };
  }

  if (['sla', 'priority', 'urgent', 'critical', 'time'].some((term) => text.includes(term))) {
    return {
      text: 'Critical issues such as exposed wires, open manholes, fire, injury risk or danger near school/hospital are targeted for 4-hour SLA in CivicTrust demo. Urgent public service issues use 24-hour SLA, normal issues use 72-hour SLA.',
      actions: [
        { label: 'File Complaint', to: FILE_GRIEVANCE_PATH },
        { label: 'Track Ticket', to: '/track-ticket' },
      ],
    };
  }

  if (['write application', 'formal complaint', 'application', 'draft', 'copilot', 'civicdraft'].some((term) => text.includes(term))) {
    return {
      text: 'CivicDraft AI converts rough citizen language into a formal grievance application or emergency report.',
      actions: [{ label: 'Open CivicDraft AI', to: '/copilot' }],
    };
  }

  if (['file complaint', 'file a complaint', 'new complaint', 'submit complaint', 'grievance', 'report issue'].some((term) => text.includes(term))) {
    return {
      text: 'I can help you file a grievance. You can type, speak, or use QR zone reporting. CivicDraft AI can also convert rough language into a formal application.',
      actions: [
        { label: 'File New Grievance', to: FILE_GRIEVANCE_PATH },
        { label: 'Use QR Zone', to: '/qr-zones' },
        { label: 'Open CivicDraft AI', to: '/copilot' },
      ],
    };
  }

  if (['qr', 'scan', 'zone', 'ward'].some((term) => text.includes(term))) {
    return {
      text: 'QR Zone Reporting lets citizens scan a location-specific QR poster. CivicTrust auto-fills ward, zone, officer and location context.',
      actions: [{ label: 'Open QR Zones', to: '/qr-zones' }],
    };
  }

  const complaintPreview = createComplaintPreviewReply(input);
  if (complaintPreview) return complaintPreview;

  return {
    text: 'I can help with CivicTrust grievance workflows only: filing a complaint, tracking a ticket, understanding SLA/priority, using QR Zones, or opening CivicDraft AI. Try typing a civic issue like “school ke paas bijli ka pole spark kar raha hai”.',
    actions: [
      { label: 'File Complaint', to: FILE_GRIEVANCE_PATH },
      { label: 'Track Demo Ticket', to: `/track-ticket?ticket=${DEMO_TICKET_ID}` },
    ],
  };
}

export default function AIAssistant({ context = 'general', formContent = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const isAuthPage = location.pathname === '/auth';
  const hasDraftComplaint = context === 'newGrievance' && formContent.description?.trim().length > 12;

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  }, [messages, isOpen, shouldReduceMotion]);

  if (isAuthPage) return null;

  const sendPrompt = (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      ...detectIntent(trimmed),
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput('');
    setIsOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendPrompt(input);
  };

  const handleNavigate = (to) => {
    navigate(to);
    setIsOpen(false);
  };

  const handleHeaderAction = (label) => {
    const prompts = {
      'File Complaint': 'How do I file a complaint?',
      'Track Ticket': `Track ${DEMO_TICKET_ID}`,
      'QR Zones': 'Use QR Zone',
      'CivicDraft AI': 'Write formal application',
      'Emergency Help': 'Emergency help',
    };
    sendPrompt(prompts[label] || label);
  };

  const renderText = (text) =>
    text.split('\n').map((line, index) => (
      <span key={`${line}-${index}`}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </span>
    ));

  return (
    <div
      className="ai-assistant-container"
      style={{
        position: 'fixed',
        right: 'clamp(1rem, 3vw, 2rem)',
        bottom: 'clamp(1rem, 3vw, 2rem)',
        zIndex: 1100,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            className="ai-assistant-bubble"
            role="dialog"
            aria-label="CivicTrust Assistant chat"
            style={{
              width: 'min(390px, calc(100vw - 2rem))',
              maxHeight: 'min(680px, calc(100vh - 7rem))',
              marginBottom: '0.875rem',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(14,165,164,0.18)',
              borderRadius: '1.5rem',
              boxShadow: '0 24px 60px -24px rgba(0,35,111,0.45)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.08), rgba(14,165,164,0.08))', borderBottom: '1px solid var(--surface-container)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--ai-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 28px -16px rgba(14,165,164,0.9)' }}>
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>CivicTrust Assistant</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: '0.125rem 0 0' }}>File, track and understand grievances</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    className="premium-button-hover"
                    aria-label="Minimize CivicTrust Assistant"
                    onClick={() => setIsOpen(false)}
                    style={{ width: '2rem', height: '2rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', background: 'rgba(255,255,255,0.65)' }}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    className="premium-button-hover"
                    aria-label="Close CivicTrust Assistant"
                    onClick={() => {
                      setIsOpen(false);
                      setMessages(initialMessages);
                    }}
                    style={{ width: '2rem', height: '2rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', background: 'rgba(255,255,255,0.65)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingTop: '0.875rem', paddingBottom: '0.125rem' }}>
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="btn-chip premium-button-hover"
                    onClick={() => handleHeaderAction(action)}
                    style={{ flex: '0 0 auto', background: 'white', borderColor: 'rgba(14,165,164,0.18)', color: 'var(--primary)' }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'linear-gradient(180deg, rgba(247,249,251,0.35), rgba(255,255,255,0.9))' }}>
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <div key={message.id} style={{ display: 'flex', justifyContent: isAssistant ? 'flex-start' : 'flex-end', marginBottom: '0.875rem' }}>
                    <div
                      style={{
                        maxWidth: '88%',
                        padding: '0.8rem 0.9rem',
                        borderRadius: isAssistant ? '1rem 1rem 1rem 0.35rem' : '1rem 1rem 0.35rem 1rem',
                        background: isAssistant ? 'white' : 'var(--primary)',
                        color: isAssistant ? 'var(--on-surface)' : 'white',
                        border: isAssistant ? '1px solid var(--surface-container)' : '1px solid var(--primary)',
                        boxShadow: isAssistant ? '0 12px 30px -22px rgba(0,35,111,0.35)' : '0 12px 24px -18px rgba(0,35,111,0.8)',
                        fontSize: '0.875rem',
                        lineHeight: 1.55,
                      }}
                    >
                      <div>{renderText(message.text)}</div>
                      {message.actions?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                          {message.actions.map((action) => (
                            <button
                              key={`${message.id}-${action.label}`}
                              type="button"
                              className="premium-button-hover"
                              onClick={() => handleNavigate(action.to)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.45rem 0.7rem',
                                borderRadius: '999px',
                                background: 'rgba(14,165,164,0.1)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(14,165,164,0.18)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {action.label} <ChevronRight size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {hasDraftComplaint && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'rgba(14,165,164,0.08)', border: '1px solid rgba(14,165,164,0.14)', marginBottom: '0.875rem' }}>
                  <ShieldAlert size={16} color="var(--primary)" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.75rem', margin: 0, fontWeight: 700, color: 'var(--primary)' }}>Draft detected</p>
                    <p style={{ fontSize: '0.75rem', margin: '0.125rem 0 0.5rem', color: 'var(--on-surface-variant)' }}>Want me to improve this complaint?</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn-chip premium-button-hover" onClick={() => handleNavigate('/copilot')}>Open CivicDraft AI</button>
                      <button type="button" className="btn-chip premium-button-hover" onClick={() => handleNavigate(FILE_GRIEVANCE_PATH)}>File Complaint</button>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '0.875rem 1rem 1rem', borderTop: '1px solid var(--surface-container)', background: 'white' }}>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.65rem' }}>
                {promptChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="btn-chip premium-button-hover"
                    onClick={() => sendPrompt(chip)}
                    style={{ flex: '0 0 auto', fontSize: '0.72rem' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about filing, tracking, SLA, or type your complaint..."
                  aria-label="Message CivicTrust Assistant"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '2.75rem',
                    borderRadius: '999px',
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-low)',
                    padding: '0 1rem',
                    outline: 'none',
                    color: 'var(--on-surface)',
                  }}
                />
                <button
                  type="submit"
                  className="premium-button-hover"
                  aria-label="Send message"
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '999px',
                    background: 'var(--ai-gradient)',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 24px -16px rgba(14,165,164,0.9)',
                    flexShrink: 0,
                  }}
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        type="button"
        title="CivicTrust Assistant"
        aria-label="Open CivicTrust Assistant"
        onClick={() => setIsOpen((current) => !current)}
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          background: 'var(--ai-gradient)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px -18px rgba(0,35,111,0.7)',
          border: '1px solid rgba(255,255,255,0.6)',
          pointerEvents: 'auto',
          position: 'relative',
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: '0.15rem',
              top: '0.15rem',
              width: '0.85rem',
              height: '0.85rem',
              borderRadius: '999px',
              background: '#10b981',
              border: '2px solid white',
            }}
          />
        )}
      </motion.button>
    </div>
  );
}
