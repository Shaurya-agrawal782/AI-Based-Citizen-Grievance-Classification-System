import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Copy, Download, Eraser, FileText, Sparkles } from 'lucide-react';

const DRAFT_STORAGE_KEY = 'civictrust_draft_complaint';

const departmentRules = [
  { label: 'Electricity', keywords: ['bijli', 'electricity', 'power', 'wire', 'pole', 'spark', 'current', 'transformer'] },
  { label: 'Water', keywords: ['pani', 'water', 'pipeline', 'tap', 'leakage'] },
  { label: 'Sanitation', keywords: ['kachra', 'garbage', 'drain', 'nala', 'gandagi'] },
  { label: 'Road', keywords: ['road', 'sadak', 'pothole', 'gaddha'] },
  { label: 'Safety', keywords: ['fire', 'accident', 'danger', 'injury', 'collapse', 'school', 'hospital'] },
];

const urgencyKeywords = ['spark', 'fire', 'current', 'open manhole', 'accident', 'injury', 'danger', 'school', 'hospital', 'contaminated', 'collapse'];
const locationKeywords = ['near', 'paas', 'ward', 'road', 'school', 'hospital', 'market', 'bus stand', 'colony', 'area'];
const toneOptions = ['Simple', 'Formal', 'Urgent', 'Government Application'];

function normalize(value) {
  return value.toLowerCase().trim();
}

function hasKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectDepartment(text) {
  const normalized = normalize(text);
  return departmentRules.find((rule) => hasKeyword(normalized, rule.keywords))?.label || '';
}

function detectUrgency(text) {
  const normalized = normalize(text);
  if (!hasKeyword(normalized, urgencyKeywords)) return '';
  return hasKeyword(normalized, ['spark', 'fire', 'current', 'open manhole', 'accident', 'injury', 'danger', 'school', 'hospital', 'collapse'])
    ? 'Critical'
    : 'High';
}

function detectLocation(text) {
  return hasKeyword(normalize(text), locationKeywords);
}

function buildQualityCheck(text) {
  const trimmed = text.trim();
  const department = detectDepartment(trimmed);
  const urgency = detectUrgency(trimmed);
  const hasLocation = detectLocation(trimmed);
  const isClear = trimmed.length >= 18 && trimmed.split(/\s+/).length >= 4;

  return [
    {
      ok: isClear,
      text: isClear ? 'Issue is clear' : 'Issue needs a little more detail',
      warning: !isClear,
    },
    {
      ok: hasLocation,
      text: hasLocation ? 'Location or landmark is present' : 'Exact address or landmark recommended',
      warning: !hasLocation,
    },
    {
      ok: Boolean(department),
      text: department ? `Department can be identified: ${department}` : 'Department not clear yet',
      warning: !department,
    },
    {
      ok: Boolean(urgency),
      text: urgency ? `Urgency detected: ${urgency}` : 'Urgency not detected',
      warning: !urgency,
    },
    {
      ok: false,
      text: urgency === 'Critical' ? 'Photo evidence strongly recommended' : 'Photo evidence recommended',
      warning: true,
    },
  ];
}

function sentenceCase(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function improveText(input, tone) {
  const text = sentenceCase(input).replace(/\s+/g, ' ');
  const department = detectDepartment(text);
  const urgency = detectUrgency(text);
  const locationHint = detectLocation(text) ? '' : ' The exact location or nearby landmark should be added for faster action.';

  if (!text) return '';

  if (tone === 'Urgent' || urgency === 'Critical') {
    return `${text}. This appears to be a safety-sensitive civic issue${department ? ` related to ${department}` : ''}. Immediate inspection and corrective action are requested.${locationHint}`;
  }

  if (tone === 'Government Application') {
    return `I wish to bring to your notice that ${text}. Kindly register this grievance, assign it to the relevant department${department ? ` (${department})` : ''}, and update the citizen with the action taken.${locationHint}`;
  }

  if (tone === 'Formal') {
    return `${text}. I request the concerned department${department ? ` (${department})` : ''} to inspect the issue and take timely action.${locationHint}`;
  }

  return `${text}.${locationHint}`;
}

function createFormalApplication(input, tone) {
  const improved = improveText(input, tone);
  const department = detectDepartment(input) || 'concerned department';

  if (!improved) return '';

  return [
    'Respected Sir/Madam,',
    '',
    `I would like to submit a civic grievance regarding the following issue: ${improved}`,
    '',
    `This matter appears to require attention from the ${department}. Kindly arrange inspection, take necessary corrective action, and provide an update on the resolution status.`,
    '',
    'Thank you.',
  ].join('\n');
}

function createEmergencyReport(input) {
  const text = sentenceCase(input).replace(/\s+/g, ' ');
  const department = detectDepartment(text);

  if (!text) return '';

  return [
    'EMERGENCY CIVIC REPORT',
    '',
    `Issue: ${text}`,
    department ? `Likely Department: ${department}` : 'Likely Department: To be verified by CivicTrust',
    'Priority: Critical if there is immediate danger to citizens, children, patients, pedestrians, or public property.',
    '',
    'Recommended Action: Please dispatch a field team immediately, secure the affected area, and update the citizen with the response timeline.',
  ].join('\n');
}

function buildOutputs(input, tone) {
  const simple = improveText(input, tone);
  if (!simple) return [];

  return [
    {
      key: 'simple',
      title: 'Simple Complaint',
      description: 'Clear, short and ready for the complaint form.',
      content: simple,
    },
    {
      key: 'formal',
      title: 'Formal Application',
      description: 'Structured application format for civic authorities.',
      content: createFormalApplication(input, tone),
    },
    {
      key: 'emergency',
      title: 'Emergency Report',
      description: 'Safety-first version for urgent civic risks.',
      content: createEmergencyReport(input),
    },
  ];
}

export default function GrievanceCopilot({
  roughText,
  onApply,
  initialText = 'School ke paas bijli ka pole spark kar raha hai...',
  compact = false,
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(roughText !== undefined ? roughText : initialText);
  const [tone, setTone] = useState('Formal');
  const [focusedOutput, setFocusedOutput] = useState('simple');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    if (roughText !== undefined) {
      setDraft(roughText || '');
    }
  }, [roughText]);

  const outputs = useMemo(() => buildOutputs(draft, tone), [draft, tone]);
  const qualityCheck = useMemo(() => buildQualityCheck(draft), [draft]);

  const handleCopy = async (key, content) => {
    await navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  const handleDownload = (title, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `CivicDraft_${title.replace(/\s+/g, '_')}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUse = (content) => {
    if (onApply) {
      onApply(content);
      return;
    }

    localStorage.setItem(DRAFT_STORAGE_KEY, content);
    navigate('/new-grievance');
  };

  const focusOutput = (key) => {
    setFocusedOutput(key);
  };

  return (
    <div className="card premium-card-hover soft-glow-hover" style={{ padding: compact ? '1.25rem' : '1.5rem', borderLeft: '4px solid var(--ai-teal)', background: 'var(--surface-container-lowest)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--ai-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 32px -22px rgba(14,165,164,0.9)' }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>CivicDraft AI</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0.125rem 0 0' }}>Focused grievance writing assistant</p>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label" htmlFor="civicdraft-issue">Describe your issue in your own words</label>
        <textarea
          id="civicdraft-issue"
          className="form-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Example: School ke paas bijli ka pole spark kar raha hai..."
          rows={compact ? 4 : 5}
          style={{ background: 'white' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Tone selector">
          {toneOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTone(option)}
              className={`btn btn-sm premium-button-hover ${tone === option ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.45rem 0.75rem' }}
            >
              {option}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-ghost btn-sm premium-button-hover" onClick={() => setDraft('')}>
          <Eraser size={15} /> Clear
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button type="button" className="btn btn-outline premium-button-hover" onClick={() => focusOutput('simple')}>
          <Sparkles size={16} /> Improve Text
        </button>
        <button type="button" className="btn btn-outline premium-button-hover" onClick={() => focusOutput('formal')}>
          <FileText size={16} /> Create Formal Application
        </button>
        <button type="button" className="btn btn-outline premium-button-hover" onClick={() => focusOutput('emergency')}>
          <AlertTriangle size={16} /> Create Emergency Report
        </button>
      </div>

      {outputs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {outputs.map((output) => (
            <div
              key={output.key}
              className="premium-card-hover"
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${focusedOutput === output.key ? 'rgba(14,165,164,0.35)' : 'var(--surface-container)'}`,
                background: focusedOutput === output.key ? 'linear-gradient(135deg, rgba(14,165,164,0.08), rgba(30,58,138,0.04))' : 'var(--surface-container-low)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.2rem' }}>{output.title}</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{output.description}</p>
                </div>
                {focusedOutput === output.key && (
                  <span className="badge" style={{ background: 'rgba(14,165,164,0.12)', color: 'var(--primary)' }}>Selected</span>
                )}
              </div>

              <div style={{ padding: '0.85rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-container)', minHeight: '160px', whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--on-surface)' }}>
                {output.content}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.85rem' }}>
                <button type="button" className="btn btn-ghost btn-sm premium-button-hover" onClick={() => handleCopy(output.key, output.content)}>
                  {copiedKey === output.key ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copiedKey === output.key ? 'Copied' : 'Copy'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm premium-button-hover" onClick={() => handleUse(output.content)}>
                  Use in Complaint Form
                </button>
                <button type="button" className="btn btn-outline btn-sm premium-button-hover" onClick={() => handleDownload(output.title, output.content)}>
                  <Download size={14} /> Download .txt
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Start by describing the issue. CivicDraft AI will generate simple, formal and emergency-ready versions.
        </div>
      )}

      <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'rgba(30,58,138,0.04)', border: '1px solid rgba(30,58,138,0.1)' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={17} color="var(--primary)" /> Complaint Quality Check
        </h4>
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {qualityCheck.map((item) => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.84rem', color: item.ok ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
              <span style={{ color: item.ok ? '#10b981' : '#f59e0b', fontWeight: 900, lineHeight: 1.2 }}>
                {item.ok ? '✓' : '⚠'}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
