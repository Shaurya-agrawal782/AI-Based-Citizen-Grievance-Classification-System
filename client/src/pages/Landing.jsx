import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileGrievance = () => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/grievance/new');
    } else {
      navigate('/auth');
    }
  };

  const handleTrack = () => {
    if (user) {
      navigate('/track');
    } else {
      navigate('/auth');
    }
  };

  const steps = [
    { icon: 'edit_document', title: '1. Submit', desc: 'Provide details of your grievance through our secure, guided digital form.', filled: true },
    { icon: 'auto_awesome', title: '2. AI Classification', desc: 'Our CivicTrust AI instantly analyzes, categorizes, and prioritizes your submission.', gradient: true },
    { icon: 'account_tree', title: '3. Routing', desc: 'Automatically directed to the exact departmental desk responsible for resolution.' },
    { icon: 'check_circle', title: '4. Resolution', desc: 'Track progress live until official closure and confirmation is provided.', border: true, filled: true },
  ];

  const categories = [
    { icon: 'construction', label: 'Public Infrastructure', desc: 'Potholes, broken roads, damaged footpaths', dept: 'Public Works', color: '#283593', bg: '#e8eaf6' },
    { icon: 'delete', label: 'Sanitation & Waste', desc: 'Garbage overflow, dirty streets, blocked drains', dept: 'Sanitation', color: '#2e7d32', bg: '#e8f5e9' },
    { icon: 'water_drop', label: 'Water Supply', desc: 'Leakage, no supply, pipeline issues', dept: 'Water Authority', color: '#1565c0', bg: '#e3f2fd' },
    { icon: 'bolt', label: 'Electricity', desc: 'Streetlights not working, outages, exposed wires', dept: 'Electricity Board', color: '#e65100', bg: '#fff3e0' },
    { icon: 'shield', label: 'Public Safety', desc: 'Open manholes, hazardous zones', dept: 'Municipal Safety', color: '#6a1b9a', bg: '#f3e5f5' },
  ];

  return (
    <div className="page-wrapper">
      {/* Navbar for Landing */}
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="material-symbols-outlined filled">account_balance</span>
            <span>Civic Architect Portal</span>
          </Link>
          <nav className="navbar-links">
            <a href="#how-it-works" className="navbar-link">How It Works</a>
            <a href="#categories" className="navbar-link">Categories</a>
            <a href="#features" className="navbar-link">Features</a>
          </nav>
          <div className="navbar-actions">
            {user ? (
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-secondary btn-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>dashboard</span>
                Dashboard
              </Link>
            ) : (
              <Link to="/auth" className="btn btn-secondary btn-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>login</span>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'relative',
          padding: '6rem 2rem 8rem',
          overflow: 'hidden',
          background: 'var(--surface)',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(to left, var(--surface-container-low), transparent)',
          zIndex: 0,
        }} />

        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '4rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--surface-container-lowest)',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--shadow-xl)',
              marginBottom: '2rem',
            }}>
              <span className="material-symbols-outlined filled" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>verified</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
                CivicTrust AI Enhanced
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: 'var(--on-surface)',
              marginBottom: '1.5rem',
            }}>
              Official Citizen<br />Grievance Portal
            </h1>

            <p style={{
              fontSize: '1.25rem',
              color: 'var(--on-surface-variant)',
              lineHeight: 1.6,
              maxWidth: '560px',
              marginBottom: '2rem',
            }}>
              A modern, AI-assisted platform for citizens to efficiently report issues, track resolutions, and engage with local governance. Secure, transparent, and responsive.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFileGrievance}
                className="btn btn-primary btn-lg"
              >
                File a New Grievance
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTrack}
                className="btn btn-outline btn-lg"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>manage_search</span>
                Track
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/qr-zones')}
                className="btn btn-outline btn-lg"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>qr_code_scanner</span>
                Report via QR Zone
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/copilot')}
                className="btn btn-outline btn-lg"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>smart_toy</span>
                Open CivicDraft AI
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/demo-mode')}
                className="btn btn-outline btn-lg"
                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--ai-teal)', color: 'var(--ai-teal)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>play_circle</span>
                View Winning Demo
              </motion.button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined filled" style={{ color: 'var(--secondary)', fontSize: '1.125rem' }}>check_circle</span>
                24/7 Processing
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined filled" style={{ color: 'var(--secondary)', fontSize: '1.125rem' }}>lock</span>
                Secure & Confidential
              </div>
            </div>
          </motion.div>

          {/* AI Insight Panel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ position: 'relative' }}
          >
            <div className="card" style={{ padding: '2rem', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Insight Panel</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>Live Portal Analytics</p>
                </div>
                <span className="material-symbols-outlined animate-glow" style={{
                  color: 'var(--primary)',
                  padding: '0.25rem',
                  borderRadius: '50%',
                }}>psychology</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-xl)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                      background: 'var(--primary-container)', color: 'var(--on-primary-container)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>bolt</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Avg. Classification Time</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>AI-Assisted Routing</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>1.2s</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-xl)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                      background: 'var(--secondary-container)', color: 'var(--on-secondary-container)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>task_alt</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Resolution Rate (30d)</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Departmental Action</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>94%</span>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(197,197,211,0.15)', textAlign: 'center' }}>
                <a href="#" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>View Public Transparency Report</a>
              </div>
            </div>
            {/* Decorative bg */}
            <div style={{
              position: 'absolute',
              bottom: '-0.75rem',
              right: '-0.75rem',
              width: '100%',
              height: '100%',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              zIndex: 0,
            }} />
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '6rem 2rem', background: 'var(--surface-container-low)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px', margin: '0 auto 4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem' }}>
              Process Overview
            </p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
              How CivicTrust AI Works
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
              Our streamlined process ensures your grievance reaches the right department immediately, reducing wait times and increasing transparency.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2rem',
            position: 'relative',
          }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              top: '3rem',
              left: '10%',
              right: '10%',
              height: '2px',
              background: 'rgba(197,197,211,0.25)',
              zIndex: 0,
            }} />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div style={{
                  width: '6rem',
                  height: '6rem',
                  borderRadius: '50%',
                  background: step.gradient
                    ? 'linear-gradient(135deg, rgba(30,58,138,0.08), rgba(14,165,164,0.08))'
                    : 'var(--surface-container-lowest)',
                  boxShadow: 'var(--shadow-xl)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                  border: step.border ? '2px solid var(--secondary)' : 'none',
                  position: 'relative',
                }}>
                  {step.gradient && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'var(--ai-gradient)',
                      opacity: 0.08,
                    }} />
                  )}
                  <span
                    className={`material-symbols-outlined ${step.filled ? 'filled' : ''}`}
                    style={{
                      fontSize: '2rem',
                      color: step.gradient ? 'var(--ai-teal)' : step.border ? 'var(--secondary)' : 'var(--primary)',
                    }}
                  >
                    {step.icon}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{step.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Targeted Grievances / Categories */}
      <section id="categories" style={{ padding: '6rem 2rem', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px', margin: '0 auto 4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem' }}>
              Targeted Grievances
            </p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
              Categories We Handle
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
              Our system focuses on key urban civic issues and routes them to the right department automatically.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '900px', margin: '0 auto' }}>
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ x: 4, boxShadow: '0 12px 24px -8px rgba(25,28,30,0.1)' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.25rem 1.5rem',
                  background: 'var(--surface-container-lowest)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid rgba(197,197,211,0.15)',
                  gap: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              >
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)',
                  background: cat.bg, color: cat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: cat.color }}>{cat.label}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{cat.desc}</p>
                </div>
                <div style={{
                  background: cat.bg,
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: cat.color,
                  whiteSpace: 'nowrap',
                }}>
                  Dept: {cat.dept}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '6rem 2rem', background: 'var(--surface-container-low)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px', margin: '0 auto 4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem' }}>
              Why Choose CivicTrust
            </p>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
              AI-Powered Features
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: 'smart_toy', title: 'AI Classification', desc: 'NLP-driven accurate classification and auto-routing to departments' },
              { icon: 'content_copy', title: 'Duplicate Detection', desc: 'Automatic detection of duplicate complaints to avoid redundancy' },
              { icon: 'priority_high', title: 'Priority Handling', desc: 'Smart priority system based on urgency and impact assessment' },
              { icon: 'translate', title: 'Language Support', desc: 'Multilingual NLP support for complaint filing in regional languages' },
              { icon: 'speed', title: 'Real-Time Tracking', desc: 'Live tracking and status updates with citizen notifications' },
              { icon: 'analytics', title: 'Analytics Dashboard', desc: 'Smart analytics dashboard for government officials' },
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card"
                style={{ padding: '2rem' }}
              >
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(30,58,138,0.1), rgba(14,165,164,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>{feat.icon}</span>
                </div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>{feat.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        padding: '5rem 2rem',
        background: 'var(--ai-gradient)',
        textAlign: 'center',
        color: 'white',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{ maxWidth: '640px', margin: '0 auto' }}
        >
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
            Ready to Report an Issue?
          </h2>
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '2rem', lineHeight: 1.6 }}>
            Your complaint matters. File it now and our AI will ensure it reaches the right department immediately.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleFileGrievance}
            style={{
              padding: '1rem 2.5rem',
              background: 'white',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-xl)',
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
            }}
          >
            Get Started Now
            <span className="material-symbols-outlined" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>arrow_forward</span>
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        background: 'var(--surface-container-low)',
        borderTop: '1px solid rgba(197,197,211,0.15)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { icon: 'visibility', label: 'Transparent Process' },
            { icon: 'speed', label: 'Faster Resolution' },
            { icon: 'smart_toy', label: 'AI-Driven Routing' },
            { icon: 'people', label: 'Citizen-Centric Approach' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          © 2026 Civic Architect Portal. Secure Government Infrastructure. | BGI Hackathon
        </p>
      </footer>
    </div>
  );
}
