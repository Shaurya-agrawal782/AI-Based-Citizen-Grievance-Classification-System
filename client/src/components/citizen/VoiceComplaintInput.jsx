import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

const languages = [
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'en-IN', label: 'English India' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'kn-IN', label: 'Kannada' }
];

export default function VoiceComplaintInput({ value, onChange, language = 'hi-IN', onLanguageChange }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          onChange(value + (value ? ' ' : '') + event.results[i][0].transcript);
        } else {
          currentTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (event.error === 'network') {
        setError('Network error occurred during speech recognition.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, value, onChange]);

  const toggleListening = (e) => {
    e.preventDefault();
    if (!isSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Speech recognition failed to start", err);
      }
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    onChange('');
  };

  if (!isSupported) {
    return (
      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label className="form-label" htmlFor="description">Detailed Description</label>
        <textarea id="description" className="form-textarea" value={value} onChange={e => onChange(e.target.value)} placeholder="Provide as much detail as possible to assist in resolution..." rows={6} required />
        <p style={{ fontSize: '0.8125rem', color: 'var(--error)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={14} /> Voice input is not supported in this browser. Please type your complaint.
        </p>
      </div>
    );
  }

  return (
    <div className="form-group" style={{ position: 'relative', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label className="form-label" htmlFor="description" style={{ margin: 0 }}>Detailed Description</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isListening}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface)'
            }}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
          {value && (
            <button onClick={handleClear} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--on-surface-variant)' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          id="description"
          className="form-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Provide as much detail as possible to assist in resolution..."
          rows={6}
          required
          style={{ paddingBottom: '3.5rem' }}
        />

        {transcript && (
          <div style={{
            position: 'absolute',
            bottom: '4rem',
            left: '0.75rem',
            right: '3.5rem',
            background: 'var(--surface-container-low)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
            fontStyle: 'italic',
            pointerEvents: 'none'
          }}>
            {transcript}...
          </div>
        )}

        <button
          aria-label={isListening ? "Stop Recording" : "Start Voice Complaint"}
          onClick={toggleListening}
          className={`btn-icon ${isListening ? 'animate-pulse' : ''}`}
          style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            background: isListening ? 'var(--error)' : 'var(--primary-container)',
            color: isListening ? 'white' : 'var(--on-primary-container)',
            width: '2.5rem',
            height: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
          {isListening ? (
            <span style={{ color: 'var(--error)', fontWeight: 600 }}>● Recording... Speak now.</span>
          ) : (
            <span>Try saying: "School ke paas bijli ka pole spark kar raha hai"</span>
          )}
        </p>

        {error && (
          <p style={{ fontSize: '0.75rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.25rem', maxWidth: '60%', textAlign: 'right' }}>
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
