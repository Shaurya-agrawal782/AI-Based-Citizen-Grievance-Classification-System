import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageSquare, Info, AlertTriangle } from 'lucide-react';

export default function AIAssistant({ context = 'general', formContent = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tip, setTip] = useState('');

  const tips = {
    general: [
      "I'm here to help you navigate the CivicTrust portal.",
      "You can track your grievances in real-time from the dashboard.",
      "Detailed descriptions help our AI route your issues faster."
    ],
    newGrievance: [
      "Try to mention specific landmarks like 'near the Central Park gate'.",
      "Photos of the issue can reduce resolution time by up to 40%.",
      "Our AI automatically detects the department based on your description."
    ],
    admin: [
      "High-priority tickets are highlighted in red for immediate action.",
      "You can use the 'Export Summary' to generate weekly reports.",
      "AI categorization saves roughly 15 minutes per ticket in manual routing."
    ]
  };

  useEffect(() => {
    // Rotate tips every 10 seconds
    const interval = setInterval(() => {
      const currentTips = tips[context] || tips.general;
      const randomTip = currentTips[Math.floor(Math.random() * currentTips.length)];
      setTip(randomTip);
    }, 10000);

    const currentTips = tips[context] || tips.general;
    setTip(currentTips[0]);
    return () => clearInterval(interval);
  }, [context]);

  // Contextual tips based on form content
  useEffect(() => {
    if (context === 'newGrievance' && formContent.description?.length > 0) {
      if (formContent.description.length < 20) {
        setTip("Adding more details about the exact problem helps officials act faster.");
      } else if (!formContent.location && formContent.description.length > 50) {
        setTip("Don't forget to specify the location or use the 'Detect My Location' button.");
      }
    }
  }, [formContent, context]);

  const [actionResponse, setActionResponse] = useState('');

  const handleAction = (type) => {
    if (type === 'how') {
      setActionResponse("Our AI uses Gemini 1.5 to analyze text in 50+ languages, extract sentiment, and determine department priority automatically.");
    } else {
      setActionResponse("Connecting you to a human agent... Current wait time is 2 minutes.");
    }
    setTimeout(() => setActionResponse(''), 5000);
  };

  return (
    <div className="ai-assistant-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="ai-assistant-bubble"
            style={{
              background: 'white',
              borderRadius: '1.5rem',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              width: '300px',
              marginBottom: '1rem',
              border: '1px solid var(--primary-container)',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
            >
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '50%' }}>
                <Sparkles size={18} />
              </div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>CivicTrust AI Guide</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: 0 }}>
              {actionResponse || tip}
            </p>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-container)', display: 'flex', gap: '0.5rem' }}>
              <button className="btn-chip" style={{ fontSize: '0.75rem' }} onClick={() => handleAction('how')}>How it works</button>
              <button className="btn-chip" style={{ fontSize: '0.75rem' }} onClick={() => handleAction('support')}>Contact Support</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(var(--primary-rgb), 0.3)',
          position: 'relative'
        }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              background: '#ff4081',
              borderRadius: '50%',
              border: '2px solid white'
            }}
          />
        )}
      </motion.button>
    </div>
  );
}
