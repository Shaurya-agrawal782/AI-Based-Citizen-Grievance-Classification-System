import React, { useState } from 'react';
import { Mic, Zap, Target, ShieldCheck, Layers, Bot, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function PitchScriptCard() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: '2rem', border: '2px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ padding: '0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '8px' }}>
              <Mic size={20} />
            </span>{t('minor.pitchTitleMinor')}</h2>
          <p style={{ color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>{t('minor.pitchDesc')}</p>
        </div>
      </div>

      <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--primary)', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.8, fontStyle: 'italic', fontWeight: 500 }}>
          {t('minor.pitchQuote').split('intelligent')[0]}<strong style={{ color: 'var(--primary)' }}>intelligent grievance redressal</strong>."
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{t('minor.techDiff')}</h3>
        <button onClick={() => setExpanded(!expanded)} className="btn btn-ghost btn-sm">
          {expanded ? <><ChevronUp size={16} /> {t('minor.hideDetails')}</> : <><ChevronDown size={16} /> {t('minor.showArch')}</>}
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            { icon: Bot, title: t('minor.modAI'), desc: t('minor.modAIDesc') },
            { icon: AlertTriangle, title: t('minor.polSLA'), desc: t('minor.polSLADesc') },
            { icon: Target, title: t('minor.authRoute'), desc: t('minor.authRouteDesc') },
            { icon: Layers, title: t('minor.semCluster'), desc: t('minor.semClusterDesc') },
            { icon: Zap, title: t('minor.adaptTax'), admin: true, desc: t('minor.adaptTaxDesc') },
            { icon: ShieldCheck, title: t('minor.privMask'), desc: t('minor.privMaskDesc') }
          ].map((feature, i) => (
            <div key={i} style={{ padding: '1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                <feature.icon size={16} />
                <span style={{ fontSize: '0.875rem' }}>{feature.title}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
