import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const citizenLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/grievance/new', label: 'File Grievance' },
    { path: '/track', label: 'Track Complaint' },
  ];

  const adminLinks = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/analytics', label: 'Analytics' },
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
    <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'rgba(255, 255, 255, 0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(254,215,170,0.6)', boxShadow: 'var(--shadow-sm)' }}>
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
              Smart Tools <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem' }}>expand_more</span>
            </button>
            {showSmartTools && (
              <div className="nav-dropdown nav-dropdown-enter" style={{ position: 'absolute', top: '100%', left: '0', minWidth: '230px', background: 'rgba(255,255,255,0.95)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(254,215,170,0.72)', zIndex: 1000, marginTop: '0.5rem', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                <Link to="/qr-zones" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>qr_code_scanner</span>
                  QR Zones
                </Link>
                <Link to="/track-ticket" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: 'var(--secondary)' }}>confirmation_number</span>
                  Track Ticket
                </Link>
                <Link to="/copilot" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem', color: '#10b981' }}>smart_toy</span>
                  CivicDraft AI
                </Link>
                <div style={{ height: '1px', background: 'var(--surface-container)', margin: '0.5rem 0' }} />
                <Link to="/demo-mode" className="nav-dropdown-item nav-item-hover" style={{ gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--ai-teal)' }} onClick={() => setShowSmartTools(false)}>
                  <span className="material-symbols-outlined nav-icon" style={{ fontSize: '1.125rem' }}>play_circle</span>
                  Demo Mode
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="navbar-actions">
          <div className="navbar-search" style={{ maxWidth: '200px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--outline)' }}>search</span>
            <input type="text" placeholder="Search ID..." style={{ fontSize: '0.875rem' }} />
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon btn-ghost" title="Notifications" onClick={toggleNotifs}>
              <span className="material-symbols-outlined">notifications</span>
              {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
            </button>
            {showNotifications && (
              <div className="nav-dropdown animate-fade-in" style={{ width: '300px' }}>
                <h4 style={{ margin: '0.5rem 1rem 1rem' }}>Notifications</h4>
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
                <button className="btn-ghost" style={{ width: '100%', borderTop: '1px solid var(--surface-container)', borderRadius: 0, padding: '0.75rem' }} onClick={() => setNotifCount(0)}>Clear All</button>
              </div>
            )}
          </div>

          {/* Help */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon btn-ghost" title="Help" onClick={toggleHelp}>
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            {showHelp && (
              <div className="nav-dropdown animate-fade-in">
                <div className="nav-dropdown-item" style={{ gap: '0.75rem' }}>
                  <span className="material-symbols-outlined">support_agent</span>
                  <span>Live Support</span>
                </div>
                <div className="nav-dropdown-item" style={{ gap: '0.75rem' }}>
                  <span className="material-symbols-outlined">description</span>
                  <span>User Guide</span>
                </div>
                <div className="nav-dropdown-item" style={{ gap: '0.75rem' }}>
                  <span className="material-symbols-outlined">feedback</span>
                  <span>System Feedback</span>
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
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={logout}
                    className="nav-dropdown-item"
                    style={{ width: '100%', gap: '0.75rem', color: 'var(--error)' }}
                  >
                    <span className="material-symbols-outlined">logout</span>
                    <span>Logout</span>
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
