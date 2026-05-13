import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './common/LanguageSwitcher';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const citizenLinks = [
    { path: '/dashboard', label: t('nav.dashboard') },
    { path: '/grievance/new', label: t('nav.fileGrievance') },
    { path: '/track', label: t('nav.trackComplaint') },
  ];

  const adminLinks = [
    { path: '/admin', label: t('nav.dashboard') },
    { path: '/admin/analytics', label: t('nav.analytics') },
  ];

  const links = isAdmin ? adminLinks : citizenLinks;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSmartTools, setShowSmartTools] = useState(false);
  const smartToolsRef = React.useRef(null);
  const [notifCount, setNotifCount] = useState(3);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (smartToolsRef.current && !smartToolsRef.current.contains(event.target)) {
        setShowSmartTools(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowSmartTools(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleNotifs = () => { setShowNotifications(!showNotifications); setShowHelp(false); setShowProfile(false); };
  const toggleHelp = () => { setShowHelp(!showHelp); setShowNotifications(false); setShowProfile(false); };
  const toggleProfile = () => { setShowProfile(!showProfile); setShowNotifications(false); setShowHelp(false); };

  return (
    <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(255, 255, 255, 0.84)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(226,232,240,0.72)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="navbar-inner">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="navbar-brand">
          <span className="material-symbols-outlined filled">account_balance</span>
          <span>CivicTrust AI</span>
        </Link>

        <nav className="navbar-links">
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="nav-dropdown-wrapper" style={{ position: 'relative' }} ref={smartToolsRef}>
            <button
              className="navbar-link btn-ghost premium-button-hover"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--on-surface)', borderRadius: 'var(--radius-full)' }}
              onClick={() => setShowSmartTools(!showSmartTools)}
            >
              {t('nav.smartTools')} <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem' }}>expand_more</span>
            </button>
            {showSmartTools && (
              <div className="nav-dropdown nav-dropdown-enter" style={{ position: 'absolute', top: '100%', left: '0', minWidth: '260px', background: 'rgba(255,255,255,0.96)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(226,232,240,0.78)', zIndex: 1000, marginTop: '0.5rem', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                <p style={{ padding: '0.5rem 0.75rem 0.25rem', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('nav.reportingTools')}</p>
                <Link to="/qr-zones" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>qr_code_scanner</span>
                  {t('nav.qrZones')}
                </Link>
                <Link to="/copilot" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: '#10b981' }}>smart_toy</span>
                  {t('nav.civicDraft')}
                </Link>
                <Link to="/track-ticket" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: 'var(--secondary)' }}>confirmation_number</span>
                  {t('nav.trackTicket')}
                </Link>
                <Link to="/omni-access" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: 'var(--ai-teal)' }}>hub</span>
                  {t('nav.omniAccess')}
                </Link>
                <div style={{ height: '1px', background: 'var(--surface-container)', margin: '0.5rem 0' }} />
                <p style={{ padding: '0.25rem 0.75rem', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{t('nav.demoChannels')}</p>
                <Link to="/whatsapp-demo" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#128c7e' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem' }}>chat</span>
                  {t('nav.whatsappDemo')}
                </Link>
                <Link to="/ivr-demo" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: '#c2410c' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem' }}>call</span>
                  {t('nav.ivrDemo')}
                </Link>
                <Link to="/demo-mode" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--ai-teal)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem' }}>play_circle</span>
                  {t('nav.demoMode')}
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="navbar-actions">
          <div className="navbar-search" style={{ maxWidth: '200px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--outline)' }}>search</span>
            <input type="text" placeholder={t('common.search') + ' ID...'} style={{ fontSize: '0.875rem' }} />
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon btn-ghost" title={t('common.notifications')} onClick={toggleNotifs}>
              <span className="material-symbols-outlined">notifications</span>
              {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
            </button>
            {showNotifications && (
              <div className="nav-dropdown animate-fade-in" style={{ width: '300px' }}>
                <h4 style={{ margin: '0.5rem 1rem 1rem' }}>{t('common.notifications')}</h4>
                {[
                  { text: 'Complaint #GRV-1024 updated to In-Progress', time: '5m ago', type: 'info' },
                  { text: 'New department assigned: Water Authority', time: '1h ago', type: 'success' },
                  { text: 'Reminder: Complete feedback for #GRV-0988', time: '2h ago', type: 'warning' }
                ].map((n, i) => (
                  <div key={i} className="nav-dropdown-item">
                    <p style={{ fontSize: '0.8125rem', margin: 0 }}>{n.text}</p>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--outline)' }}>{n.time}</span>
                  </div>
                ))}
                <button className="btn-ghost" style={{ width: '100%', borderTop: '1px solid var(--surface-container)', borderRadius: 0, padding: '0.75rem' }} onClick={() => setNotifCount(0)}>{t('common.clearAll')}</button>
              </div>
            )}
          </div>

          {/* Help */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon btn-ghost" title={t('common.help')} onClick={toggleHelp}>
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            {showHelp && (
              <div className="nav-dropdown animate-fade-in">
                <div className="nav-dropdown-item" style={{ gap: '0.75rem' }}>
                  <span className="material-symbols-outlined">support_agent</span>
                  <span>{t('common.liveSupport')}</span>
                </div>
                <div className="nav-dropdown-item" style={{ gap: '0.75rem' }}>
                  <span className="material-symbols-outlined">description</span>
                  <span>{t('common.userGuide')}</span>
                </div>
                <div className="nav-dropdown-item" style={{ gap: '0.75rem' }}>
                  <span className="material-symbols-outlined">feedback</span>
                  <span>{t('common.systemFeedback')}</span>
                </div>
              </div>
            )}
          </div>

          {user && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="navbar-avatar-btn"
                onClick={toggleProfile}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className="navbar-avatar">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </button>
              {showProfile && (
                <div className="nav-dropdown animate-fade-in" style={{ right: 0 }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-container)' }}>
                    <p style={{ fontWeight: 700, margin: 0 }}>{user.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0 }}>{user.email}</p>
                    <span className="badge badge-ai" style={{ marginTop: '0.5rem' }}>{user.role}</span>
                  </div>
                  <button className="nav-dropdown-item" style={{ width: '100%', gap: '0.75rem' }}>
                    <span className="material-symbols-outlined">person</span>
                    <span>{t('common.profileSettings')}</span>
                  </button>
                  <button
                    onClick={logout}
                    className="nav-dropdown-item"
                    style={{ width: '100%', gap: '0.75rem', color: 'var(--error)' }}
                  >
                    <span className="material-symbols-outlined">{t('common.logout')}</span>
                    <span>{t('common.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}