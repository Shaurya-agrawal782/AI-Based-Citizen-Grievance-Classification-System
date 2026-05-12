import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  MessageCircle,
  Mic,
  MonitorCog,
  PhoneCall,
  QrCode,
  Smartphone,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { demoChannels } from '../data/demoChannels';
import { cardReveal, cardStagger, heroReveal, pageRevealProps } from '../utils/pageMotion';

const sourceBadges = ['Web', 'QR', 'WhatsApp', 'IVR', 'Voice'];

const accessCards = [
  {
    title: 'Digital-first citizens',
    description: 'Citizens can file complaints through the web portal, QR zone reporting, or voice input.',
    Icon: Smartphone,
    accent: 'var(--primary)',
    softBg: 'rgba(30,58,138,0.08)',
    actions: [
      { label: 'File Complaint', to: '/new-grievance' },
      { label: 'QR Zones', to: '/qr-zones', outline: true },
    ],
  },
  {
    title: 'WhatsApp-style reporting',
    description: 'Citizens can send a simple message and CivicTrust converts it into a trackable grievance ticket.',
    Icon: MessageCircle,
    accent: '#128c7e',
    softBg: 'rgba(18,140,126,0.1)',
    actions: [
      { label: 'Open WhatsApp Demo', to: '/whatsapp-demo' },
    ],
  },
  {
    title: 'Phone call / keypad reporting',
    description: 'Elderly citizens can use a simple keypad-based complaint flow without needing a smartphone app.',
    Icon: PhoneCall,
    accent: '#c2410c',
    softBg: 'rgba(251,146,60,0.16)',
    actions: [
      { label: 'Open IVR Demo', to: '/ivr-demo' },
    ],
  },
  {
    title: 'One dashboard for all channels',
    description: 'Complaints from Web, QR, WhatsApp, Voice and IVR can be tracked in one admin workflow.',
    Icon: MonitorCog,
    accent: 'var(--ai-teal)',
    softBg: 'rgba(14,165,164,0.1)',
    actions: [],
    isCommandCenter: true,
  },
];

const channelIcons = {
  Web: Smartphone,
  QR: QrCode,
  WhatsApp: MessageCircle,
  IVR: PhoneCall,
  Voice: Mic,
};

export default function OmniAccess() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="page-wrapper page-shell app-warm-bg">
      <Navbar />
      <main className="container page-content" style={{ maxWidth: '1180px' }}>
        <motion.section
          className="animate-page-hero"
          variants={heroReveal}
          {...pageRevealProps(shouldReduceMotion)}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <div className="badge badge-ai" style={{ marginBottom: '1rem' }}>CivicTrust OmniAccess</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '1rem', color: 'var(--on-surface)' }}>
            CivicTrust OmniAccess
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', maxWidth: '760px', margin: '0 auto', lineHeight: 1.7 }}>
            Grievance access for every citizen — Web, QR, WhatsApp, Voice and Phone IVR.
          </p>
        </motion.section>

        <motion.section
          className="animate-card-grid"
          variants={cardStagger}
          {...pageRevealProps(shouldReduceMotion)}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}
        >
          {demoChannels.map((item) => {
            const Icon = channelIcons[item.channel] || BarChart3;

            return (
              <motion.div key={item.channel} className="animate-card" variants={cardReveal}>
                <div className="stat-card premium-card-hover" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div className="stat-icon">
                      <Icon size={22} />
                    </div>
                    <span className="stat-value" style={{ color: item.channel === 'IVR' ? '#c2410c' : 'var(--primary)' }}>
                      {item.count}
                    </span>
                  </div>
                  <div>
                    <p className="stat-label">{item.channel}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginTop: '0.35rem' }}>{item.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.section>

        <motion.section
          className="animate-card-grid"
          variants={cardStagger}
          {...pageRevealProps(shouldReduceMotion)}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}
        >
          {accessCards.map(({ title, description, Icon, accent, softBg, actions, isCommandCenter }) => (
            <motion.div key={title} className="animate-card" variants={cardReveal}>
              <article className="glass-card premium-card-hover" style={{ padding: '2rem', minHeight: '310px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: '3.25rem', height: '3.25rem', borderRadius: '1rem', background: softBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <Icon size={26} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 850, marginBottom: '0.75rem', color: 'var(--on-surface)' }}>{title}</h2>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, fontSize: '0.95rem', flex: 1 }}>{description}</p>

                {isCommandCenter ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.5rem' }}>
                    {sourceBadges.map((source) => (
                      <span
                        key={source}
                        className="badge"
                        style={{ background: 'rgba(255,255,255,0.72)', color: source === 'IVR' ? '#c2410c' : 'var(--primary)', borderColor: 'rgba(254,215,170,0.9)' }}
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
                    {actions.map((action) => (
                      <Link
                        key={action.to}
                        to={action.to}
                        className={`btn ${action.outline ? 'btn-outline' : 'btn-primary civic-gradient-button'} premium-button-hover`}
                        style={{ borderRadius: 'var(--radius-full)', flex: actions.length > 1 ? '1 1 150px' : '1 1 100%', minHeight: '3rem' }}
                      >
                        {action.label}
                        <ArrowRight size={16} />
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            </motion.div>
          ))}
        </motion.section>
      </main>
    </div>
  );
}
