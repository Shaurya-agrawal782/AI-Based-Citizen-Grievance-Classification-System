import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import FixedLandingVideo from '../components/common/FixedLandingVideo';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const sectionGlassStyle = {
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  borderTop: '1px solid rgba(226,232,240,0.7)',
};

const cardGlassStyle = {
  background: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(226,232,240,0.7)',
  boxShadow: 'var(--shadow-sm)',
  borderRadius: '1.25rem',
};



// heroCtas defined inside component (uses t())

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const steps = [
    {
      icon: 'edit_document',
      title: t('landing.step1Title'),
      desc: t('landing.step1Desc'),
      filled: true,
    },
    {
      icon: 'auto_awesome',
      title: t('landing.step2Title'),
      desc: t('landing.step2Desc'),
      gradient: true,
    },
    {
      icon: 'account_tree',
      title: t('landing.step3Title'),
      desc: t('landing.step3Desc'),
    },
    {
      icon: 'check_circle',
      title: t('landing.step4Title'),
      desc: t('landing.step4Desc'),
      border: true,
      filled: true,
    },
  ];
  
  const categories = [
    {
      icon: 'construction',
      label: 'Public Infrastructure',
      desc: 'Potholes, broken roads, damaged footpaths',
      dept: 'Public Works',
      color: '#283593',
      bg: '#e8eaf6',
    },
    {
      icon: 'delete',
      label: 'Sanitation & Waste',
      desc: 'Garbage overflow, dirty streets, blocked drains',
      dept: 'Sanitation',
      color: '#2e7d32',
      bg: '#e8f5e9',
    },
    {
      icon: 'water_drop',
      label: 'Water Supply',
      desc: 'Leakage, no supply, pipeline issues',
      dept: 'Water Authority',
      color: '#1565c0',
      bg: '#e3f2fd',
    },
    {
      icon: 'bolt',
      label: 'Electricity',
      desc: 'Streetlights not working, outages, exposed wires',
      dept: 'Electricity Board',
      color: '#e65100',
      bg: '#fff3e0',
    },
    {
      icon: 'shield',
      label: 'Public Safety',
      desc: 'Open manholes, hazardous zones',
      dept: 'Municipal Safety',
      color: '#6a1b9a',
      bg: '#f3e5f5',
    },
  ];
  
  const features = [
    {
      icon: 'smart_toy',
      title: 'AI Classification',
      desc: 'NLP-driven classification and auto-routing to the right department.',
    },
    {
      icon: 'content_copy',
      title: 'Duplicate Detection',
      desc: 'Automatic duplicate detection to reduce repeated reports and effort.',
    },
    {
      icon: 'priority_high',
      title: 'Priority Handling',
      desc: 'Smart urgency scoring based on civic impact and risk.',
    },
    {
      icon: 'translate',
      title: 'Language Support',
      desc: 'Voice, text, and multilingual support for accessible complaint filing.',
    },
    {
      icon: 'speed',
      title: 'Real-Time Tracking',
      desc: 'Live ticket tracking and visible status updates for citizens.',
    },
    {
      icon: 'analytics',
      title: 'Analytics Dashboard',
      desc: 'Actionable trend insights for government and department teams.',
    },
  ];
  
  const insightMetrics = [
    { icon: 'bolt', label: t('landing.avgClassTime'), value: '1.2s' },
    { icon: 'timer', label: t('landing.criticalSla'), value: '4h' },
    { icon: 'qr_code_scanner', label: t('landing.qrZonesEnabled'), value: t('landing.enabled') },
    { icon: 'confirmation_number', label: t('landing.ticketTrackingActive'), value: t('landing.active') },
  ];

  const heroCtas = [
    { label: t('landing.fileComplaint'), to: '/new-grievance', icon: 'arrow_forward', primary: true },
    { label: t('landing.reportViaQR'), to: '/qr-zones', icon: 'qr_code_scanner' },
    { label: t('landing.trackTicket'), to: '/track-ticket', icon: 'manage_search' },
    { label: t('landing.viewDemo'), to: '/demo-mode', icon: 'play_circle', accent: true },
  ];

  const handleFileGrievance = () => {
    navigate('/new-grievance');
  };

  return (
    <div
      className="page-wrapper landing-shell"
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflowX: 'hidden',
        isolation: 'isolate',
        background: 'var(--surface)',
      }}
    >
      <FixedLandingVideo />

      <div className="landing-content-layer" style={{ position: 'relative', zIndex: 10 }}>
        <header
          className="navbar landing-navbar"
          style={{
            background: 'rgba(255,255,255,0.86)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(226,232,240,0.7)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
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
              {/* Language Switcher on landing page */}
              <LanguageSwitcher />
              {user ? (
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-secondary btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>dashboard</span>
                  {t('nav.dashboard')}
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

        <main className="landing-main">
          <motion.section
            className="landing-hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'relative',
              padding: '6rem 2rem 8rem',
              overflow: 'hidden',
              background: 'transparent',
            }}
          >
            <div
              className="landing-hero-grid"
              style={{
                maxWidth: '1280px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1.35fr 1fr',
                gap: '4rem',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.86)',
                    border: '1px solid rgba(226,232,240,0.76)',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: 'var(--shadow-sm)',
                    marginBottom: '2rem',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <span
                    className="material-symbols-outlined filled"
                    style={{ color: 'var(--primary)', fontSize: '0.875rem' }}
                  >
                    verified
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    CivicTrust AI Enhanced
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.08,
                    color: 'var(--on-surface)',
                    marginBottom: '1.5rem',
                    maxWidth: '740px',
                  }}
                >
                  {t('landing.title')}
                </h1>

                <p
                  style={{
                    fontSize: '1.25rem',
                    color: 'var(--on-surface-variant)',
                    lineHeight: 1.6,
                    maxWidth: '650px',
                    marginBottom: '2rem',
                  }}
                >
                  {t('landing.subtitle')}
                </p>

                <div className="landing-cta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                  {heroCtas.map((button) => (
                    <motion.button
                      key={button.to}
                      type="button"
                      whileHover={{ scale: 1.02, y: button.primary ? -2 : 0 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(button.to)}
                      className={`btn ${button.primary ? 'btn-primary' : 'btn-outline'} btn-lg`}
                      style={button.accent ? { background: 'rgba(255,255,255,0.85)', borderColor: 'var(--ai-teal)', color: 'var(--ai-teal)' } : undefined}
                    >
                      {button.primary ? (
                        <>
                          {button.label}
                          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{button.icon}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{button.icon}</span>
                          {button.label}
                        </>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div
                  className="landing-trust-row"
                  style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}
                >
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

              <motion.div
                className="landing-insight-shell"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{ position: 'relative' }}
              >
                <div
                  className="landing-insight-card"
                  style={{
                    padding: '2rem',
                    position: 'relative',
                    zIndex: 2,
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: 'var(--shadow-xl)',
                    borderRadius: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('landing.insightPanel')}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{t('landing.livePortalReadiness')}</p>
                    </div>
                    <span
                      className="material-symbols-outlined animate-glow"
                      style={{
                        color: 'var(--primary)',
                        padding: '0.5rem',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.75)',
                      }}
                    >
                      psychology
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {insightMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.72)',
                          border: '1px solid rgba(226,232,240,0.72)',
                          borderRadius: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(30,58,138,0.1), rgba(14,165,164,0.12))',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{metric.icon}</span>
                          </div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--on-surface)' }}>{metric.label}</p>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.section>

          <section id="how-it-works" className="landing-section" style={{ padding: '6rem 2rem', ...sectionGlassStyle }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px', marginInline: 'auto' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  {t('landing.processOverview')}
                </p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                  {t('landing.howItWorks')}
                </h2>
                <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  {t('landing.howItWorksDesc')}
                </p>
              </div>

              <div
                className="landing-steps-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1.5rem',
                }}
              >
                {steps.map((step, i) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.12 }}
                    style={{
                      ...cardGlassStyle,
                      padding: '1.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '4rem',
                        height: '4rem',
                        borderRadius: '50%',
                        background: step.gradient
                          ? 'linear-gradient(135deg, rgba(30,58,138,0.1), rgba(14,165,164,0.12))'
                          : 'rgba(255,255,255,0.9)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        border: step.border ? '2px solid var(--secondary)' : '1px solid rgba(226,232,240,0.72)',
                      }}
                    >
                      <span
                        className={`material-symbols-outlined ${step.filled ? 'filled' : ''}`}
                        style={{ fontSize: '1.75rem', color: step.gradient ? 'var(--ai-teal)' : step.border ? 'var(--secondary)' : 'var(--primary)' }}
                      >
                        {step.icon}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>{step.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section id="categories" className="landing-section" style={{ padding: '6rem 2rem', ...sectionGlassStyle }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px', marginInline: 'auto' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  {t('landing.targetedGrievances')}
                </p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                  {t('landing.categoriesWeHandle')}
                </h2>
                <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  {t('landing.categoriesDesc')}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '900px', margin: '0 auto' }}>
                {categories.map((cat, i) => (
                  <motion.div
                    key={cat.label}
                    className="landing-category-card"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    whileHover={{ x: 4, boxShadow: '0 12px 24px -8px rgba(25,28,30,0.1)' }}
                    style={{
                      ...cardGlassStyle,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1.25rem 1.5rem',
                      gap: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                    }}
                  >
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '0.875rem',
                        background: cat.bg,
                        color: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem', color: cat.color }}>{cat.label}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{cat.desc}</p>
                    </div>
                    <div
                      className="landing-category-meta"
                      style={{
                        background: cat.bg,
                        padding: '0.375rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: cat.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('landing.dept')} {cat.dept}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section id="features" className="landing-section" style={{ padding: '6rem 2rem', ...sectionGlassStyle }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '640px', marginInline: 'auto' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  {t('landing.whyChoose')}
                </p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                  {t('landing.aiFeatures')}
                </h2>
              </div>

              <div
                className="landing-features-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {features.map((feat, i) => (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    style={{
                      ...cardGlassStyle,
                      padding: '2rem',
                    }}
                  >
                    <div
                      style={{
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '0.875rem',
                        background: 'linear-gradient(135deg, rgba(30,58,138,0.1), rgba(14,165,164,0.12))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>{feat.icon}</span>
                    </div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>{feat.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{feat.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="landing-section"
            style={{
              padding: '5rem 2rem',
              ...sectionGlassStyle,
              textAlign: 'center',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              style={{ maxWidth: '640px', margin: '0 auto' }}
            >
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                {t('landing.readyToReport')}
              </h2>
              <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', lineHeight: 1.6 }}>
                {t('landing.readyToReportDesc')}
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleFileGrievance}
                className="btn btn-primary btn-lg"
              >
                {t('landing.fileComplaint')}
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
              </motion.button>
            </motion.div>
          </section>
        </main>

        <footer
          style={{
            padding: '2rem',
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            borderTop: '1px solid rgba(226,232,240,0.7)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { icon: 'visibility', label: t('landing.transparentProcess') },
              { icon: 'speed', label: t('landing.fasterResolution') },
              { icon: 'smart_toy', label: t('landing.aiDrivenRouting') },
              { icon: 'people', label: t('landing.citizenCentric') },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            {t('landing.footerCopyright')}
          </p>
        </footer>
      </div>
    </div>
  );
}
