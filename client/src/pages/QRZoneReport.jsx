import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { qrZones } from '../data/qrZones';
import { MapPin, User, ShieldAlert, ArrowRight, QrCode } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import Navbar from '../components/Navbar';
import TicketReceipt from '../components/citizen/TicketReceipt';
import { cardReveal, heroReveal, pageRevealProps } from '../utils/pageMotion';

export default function QRZoneReport() {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const zone = qrZones.find(z => z.zoneId === zoneId);

  if (!zone) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Zone Not Found</h2>
          <p>The scanned QR code is invalid or the zone does not exist.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '2rem' }}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ background: 'var(--surface-container-low)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ padding: '2rem', maxWidth: '800px', marginTop: '2rem' }}>
        <motion.div className="animate-page-hero" variants={heroReveal} {...pageRevealProps(shouldReduceMotion)}>
        <div className="card premium-card-hover soft-glow-hover" style={{ padding: '2.5rem', borderTop: '4px solid var(--primary)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-container)' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: 'var(--radius-md)', background: 'var(--primary-container)', color: 'var(--on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={32} />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified</span> Verified QR Zone
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)' }}>{zone.zoneName}</h1>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <MapPin color="var(--secondary)" size={24} style={{ marginTop: '0.25rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>Exact Address</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>{zone.address}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{zone.ward} • {zone.zone} Zone</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <User color="var(--primary)" size={24} style={{ marginTop: '0.25rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>Assigned Zone Officer</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>{zone.officerName}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{zone.officerRole}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <ShieldAlert color="#ef4444" size={24} style={{ marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Auto-Routing Enabled</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--on-surface)', marginTop: '0.25rem' }}>This complaint will be tagged with this QR zone for faster routing. It will be automatically mapped to local authorities with high priority.</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary btn-lg premium-button-hover"
              onClick={() => navigate(`/grievance/new?zoneId=${zone.zoneId}`)}
              style={{ width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-xl)', padding: '1rem', fontSize: '1.125rem', fontWeight: 700 }}
            >
              Continue to Complaint Form <ArrowRight size={24} />
            </button>
          </div>
        </div>
        </motion.div>

        {/* Demo: What citizen receives after submission */}
        <motion.div className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)} style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.06em', marginBottom: '1rem' }}>Preview — What You Receive After Submission</p>
          <TicketReceipt
            ticketId="CT-TKT-2026-0001"
            complaintId="CT-2026-0001"
            source="QR"
            category={zone.defaultDepartmentSuggestion}
            department={zone.defaultDepartmentSuggestion}
            priority="Critical"
            status="Ticket Created"
            sla="4 hours"
            assignedOfficer={zone.officerName}
            officerRole={zone.officerRole}
            ward={zone.ward}
            zone={zone.zone}
            submittedAt={new Date().toISOString()}
          />
        </motion.div>
      </div>
    </div>
  );
}
