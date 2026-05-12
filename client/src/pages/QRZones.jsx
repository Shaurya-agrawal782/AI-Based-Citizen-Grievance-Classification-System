import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { qrZones } from '../data/qrZones';
import { QrCode, MapPin, User, Download, Link as LinkIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { cardReveal, cardStagger, heroReveal, pageRevealProps } from '../utils/pageMotion';

export default function QRZones() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="page-wrapper page-shell app-warm-bg">
      <Navbar />
      <div className="container page-content" style={{ maxWidth: '1200px' }}>
        <motion.div className="animate-page-hero" variants={heroReveal} {...pageRevealProps(shouldReduceMotion)} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="badge badge-ai" style={{ marginBottom: '1rem' }}>Smart Deployment Layer</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem', color: 'var(--on-surface)' }}>QR Zone Reporting</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
            Deploy QR posters across schools, hospitals, markets and ward offices so citizens can report issues with location and officer context auto-filled.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}>
            {['5 Active QR Zones', '3 Wards Covered', 'Location Auto-Mapped', 'Officer Context Enabled'].map((chip, idx) => (
              <span key={idx} className="badge badge-in-progress" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 700 }}>
                {chip}
              </span>
            ))}
          </div>

          <div className="glass-card" style={{ marginTop: '3rem', padding: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}><QrCode size={20} /> Scan QR</div>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>arrow_right_alt</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}><MapPin size={20} /> Location Detected</div>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>arrow_right_alt</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}><span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>assignment</span> Complaint Filed</div>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>arrow_right_alt</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}><User size={20} /> Officer Routed</div>
          </div>
        </motion.div>

        <motion.div className="animate-card-grid" variants={cardStagger} {...pageRevealProps(shouldReduceMotion)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '2rem' }}>
          {qrZones.map((zone) => {
            const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/qr-report/${zone.zoneId}` : `https://civictrust-app.onrender.com/qr-report/${zone.zoneId}`;

            const handleDownloadQR = () => {
              const canvas = document.getElementById(`qr-${zone.zoneId}`);
              if (!canvas) return;
              const url = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = url;
              a.download = `civictrust-qr-${zone.zoneId}.png`;
              a.click();
            };

            const handleCopyLink = () => {
              navigator.clipboard.writeText(qrUrl);
            };

            return (
              <motion.div key={zone.zoneId} className="animate-card" variants={cardReveal}>
                <div className="glass-card premium-card-hover qr-poster-hover" style={{ overflow: 'hidden', display: 'flex', flexWrap: 'wrap', padding: 0, height: '100%' }}>
                {/* Left: Poster Header / QR */}
                <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', background: 'var(--surface-container-lowest)', borderRight: '1px solid var(--surface-container)' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '1rem', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CivicTrust AI QR Zone</h3>
                  </div>
                  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative' }}>
                    <div className="qr-box" style={{ padding: '0.75rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', boxShadow: 'var(--shadow-sm)', marginBottom: '1rem', transition: 'box-shadow 300ms ease-out' }}>
                      <QRCodeCanvas id={`qr-${zone.zoneId}`} value={qrUrl} size={140} level="H" includeMargin={false} />
                    </div>
                    <div className="scan-ready-badge" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(16,185,129,0.12)', color: '#047857', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 700 }}>Scan Ready</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase' }}>
                      Scan to Report Civic Issue
                    </p>
                  </div>
                </div>

                {/* Right: Details & Actions */}
                <div style={{ flex: '1 1 260px', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.86)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>{zone.zoneName}</h4>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: 'var(--primary-container)', color: 'var(--primary)' }}>{zone.ward}</span>
                    <span className="badge" style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}>{zone.zone}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                     <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--outline)' }}>signpost</span>
                        <span style={{ color: 'var(--on-surface-variant)' }}>{zone.address}</span>
                     </div>
                     <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <User size={18} color="var(--outline)" />
                        <span style={{ color: 'var(--on-surface-variant)' }}><strong>{zone.officerName}</strong> ({zone.officerRole})</span>
                     </div>
                     <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--outline)' }}>home_work</span>
                        <span style={{ color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>{zone.defaultDepartmentSuggestion}</span>
                     </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to={`/qr-report/${zone.zoneId}`} className="btn btn-primary civic-gradient-button premium-button-hover soft-glow-hover" style={{ width: '100%', justifyContent: 'center' }}>Open QR Report (Demo)</Link>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleCopyLink} className="btn btn-outline btn-sm premium-button-hover" style={{ flex: 1, justifyContent: 'center' }} title="Copy QR Link">
                        <LinkIcon size={16} /> Copy Link
                      </button>
                      <button onClick={handleDownloadQR} className="btn btn-outline btn-sm premium-button-hover" style={{ flex: 1, justifyContent: 'center' }} title="Download QR Poster PNG">
                        <Download size={16} /> Download QR
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
