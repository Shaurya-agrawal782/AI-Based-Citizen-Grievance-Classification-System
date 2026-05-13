import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { supportedLanguages } from '../../i18n/translations';

/**
 * Globe-icon language switcher shown in the Navbar actions bar.
 * Active languages (en, hi) are clickable; comingSoon langs show a muted chip.
 */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const active = supportedLanguages.find((l) => l.code === lang);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id="language-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        title={t('language.switchLabel')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.375rem 0.625rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(14,165,164,0.3)',
          background: open ? 'rgba(14,165,164,0.08)' : 'transparent',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.8125rem',
          color: 'var(--primary)',
          transition: 'background 0.18s',
          whiteSpace: 'nowrap',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
          language
        </span>
        <span>{active?.nativeLabel ?? 'EN'}</span>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            minWidth: '210px',
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid rgba(226,232,240,0.8)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 2000,
            overflow: 'hidden',
            animation: 'fadeSlideDown 0.18s ease',
          }}
        >
          {/* Active languages */}
          <div style={{ padding: '0.5rem' }}>
            <p style={{
              padding: '0.375rem 0.75rem 0.25rem',
              fontSize: '0.625rem',
              fontWeight: 800,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--on-surface-variant)',
            }}>
              {t('language.switchLabel')}
            </p>
            {supportedLanguages
              .filter((l) => !l.comingSoon)
              .map((l) => {
                const isActive = lang === l.code;
                return (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { setLang(l.code); setOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: isActive ? 'rgba(14,165,164,0.1)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface-container-low)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary)' : 'var(--on-surface)' }}>
                        {l.nativeLabel}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {l.label}
                      </span>
                    </div>
                    {isActive && (
                      <span className="material-symbols-outlined filled" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Coming soon regional languages */}
          <div style={{ borderTop: '1px solid var(--surface-container)', padding: '0.5rem' }}>
            <p style={{
              padding: '0.375rem 0.75rem 0.25rem',
              fontSize: '0.625rem',
              fontWeight: 800,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--on-surface-variant)',
            }}>
              {t('language.regional')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', padding: '0.25rem 0.75rem 0.625rem' }}>
              {supportedLanguages
                .filter((l) => l.comingSoon)
                .map((l) => (
                  <span
                    key={l.code}
                    title={`${l.label} — ${t('language.comingSoon')}`}
                    style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--on-surface-variant)',
                      background: 'var(--surface-container)',
                      border: '1px solid var(--surface-container-high)',
                      cursor: 'default',
                      opacity: 0.7,
                    }}
                  >
                    {l.nativeLabel}
                    <span style={{ fontSize: '0.625rem', marginLeft: '0.3rem', opacity: 0.7 }}>
                      {t('language.comingSoon')}
                    </span>
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
