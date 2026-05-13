import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, MapPin, Ticket, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const actions = [
    { icon: Home, label: 'Go Home', path: '/' },
    { icon: MapPin, label: 'QR Zones', path: '/qr-zones' },
    { icon: Ticket, label: 'Track Ticket', path: '/track-ticket' },
    { icon: Play, label: 'Demo Mode', path: '/demo-mode' },
  ];

  return (
    <div className="page-wrapper page-shell app-warm-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container page-content" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ fontSize: '6rem', marginBottom: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
            404
          </div>
          
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--on-surface)' }}>{t('deep.pageNotFound')}</h1>
          
          <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', lineHeight: 1.6 }}>{t('deep.thePageYouReLoo')}</p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '2rem' }}
          >
            {actions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.path}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(action.path)}
                  style={{
                    padding: '1.5rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 300ms ease-out',
                  }}
                >
                  <Icon size={24} />
                  {action.label}
                </motion.button>
              );
            })}
          </motion.div>

          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              <strong>{t('deep.tip')}</strong>{t('deep.ifYouScannedAQR')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
