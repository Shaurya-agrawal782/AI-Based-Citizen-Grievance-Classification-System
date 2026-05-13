import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Tag, Clock, AlertTriangle, ChevronDown, ChevronUp, X, Save, Shield
} from 'lucide-react';
import { taxonomyAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const PRIORITY_COLORS = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  Urgent:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Normal:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  Review:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
};

const emptyForm = {
  name: '', department: '', description: '',
  synonyms: '', examples: '',
  priorityRules: { defaultPriority: 'Normal', criticalKeywords: '', urgentKeywords: '', normalKeywords: '' },
  slaRules: { criticalHours: 4, urgentHours: 24, normalHours: 72 },
  escalationRules: { criticalEscalation: '', urgentEscalation: '', normalEscalation: '' },
  isActive: true,
};

/* ── Category Card ── */
function TaxonomyCategoryCard({ cat, onEdit, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const pri = PRIORITY_COLORS[cat.priorityRules?.defaultPriority] || PRIORITY_COLORS.Normal;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-container-lowest)',
        border: `1px solid ${cat.isActive ? 'var(--outline-variant)' : 'var(--surface-container-high)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        opacity: cat.isActive ? 1 : 0.6,
      }}
    >
      {/* Card header */}
      <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '10px', background: pri.bg, color: pri.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Brain size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{cat.name}</span>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
              borderRadius: '999px', color: cat.isActive ? '#10b981' : '#6b7280',
              background: cat.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)'
            }}>
              {cat.isActive ? 'Active' : 'Inactive'}
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '999px', color: pri.color, background: pri.bg }}>
              {cat.priorityRules?.defaultPriority || 'Normal'}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>{cat.department}</p>
          {cat.description && <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', opacity: 0.8 }}>{cat.description}</p>}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--outline)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Tag size={11} />{cat.synonyms?.length || 0} synonyms
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--outline)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={11} />Critical: {cat.slaRules?.criticalHours || 4}h / Urgent: {cat.slaRules?.urgentHours || 24}h
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button onClick={() => onEdit(cat)} className="btn-icon" title={t('deep.edit')} style={{ color: 'var(--primary)' }}><Edit2 size={15} /></button>
          <button onClick={() => onToggle(cat._id)} className="btn-icon" title="Toggle" style={{ color: cat.isActive ? '#10b981' : 'var(--outline)' }}>
            {cat.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button onClick={() => onDelete(cat._id)} className="btn-icon" title={t('deep.delete')} style={{ color: 'var(--error)' }}><Trash2 size={15} /></button>
          <button onClick={() => setExpanded(e => !e)} className="btn-icon" title="Details">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem 1.25rem', borderTop: '1px solid var(--surface-container-high)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{t('deep.synonyms')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {(cat.synonyms || []).slice(0, 8).map((s, i) => (
                    <span key={i} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', background: 'var(--surface-container)', borderRadius: '999px' }}>{s}</span>
                  ))}
                  {(cat.synonyms?.length || 0) > 8 && <span style={{ fontSize: '0.6875rem', color: 'var(--outline)' }}>+{cat.synonyms.length - 8} more</span>}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{t('deep.escalationChain')}</p>
                <p style={{ fontSize: '0.75rem' }}>🔴 {cat.escalationRules?.criticalEscalation}</p>
                <p style={{ fontSize: '0.75rem' }}>🟡 {cat.escalationRules?.urgentEscalation}</p>
                <p style={{ fontSize: '0.75rem' }}>🔵 {cat.escalationRules?.normalEscalation}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{t('deep.sLAHours')}</p>
                <p style={{ fontSize: '0.75rem' }}>Critical: <strong>{cat.slaRules?.criticalHours}h</strong></p>
                <p style={{ fontSize: '0.75rem' }}>Urgent: <strong>{cat.slaRules?.urgentHours}h</strong></p>
                <p style={{ fontSize: '0.75rem' }}>Normal: <strong>{cat.slaRules?.normalHours}h</strong></p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Form Modal ── */
function TaxonomyCategoryForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm;
    return {
      ...initial,
      synonyms: (initial.synonyms || []).join(', '),
      examples: (initial.examples || []).join(', '),
      priorityRules: {
        ...initial.priorityRules,
        criticalKeywords: (initial.priorityRules?.criticalKeywords || []).join(', '),
        urgentKeywords:   (initial.priorityRules?.urgentKeywords   || []).join(', '),
        normalKeywords:   (initial.priorityRules?.normalKeywords   || []).join(', '),
      }
    };
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const setPri = (field, val) => setForm(f => ({ ...f, priorityRules: { ...f.priorityRules, [field]: val } }));
  const setSla = (field, val) => setForm(f => ({ ...f, slaRules: { ...f.slaRules, [field]: Number(val) } }));
  const setEsc = (field, val) => setForm(f => ({ ...f, escalationRules: { ...f.escalationRules, [field]: val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'auto', padding: '2rem', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{initial ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <input className="form-input" value={form.department} onChange={e => set('department', e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('deep.description')}</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Synonyms (comma-separated)</label>
              <input className="form-input" value={form.synonyms} onChange={e => set('synonyms', e.target.value)} placeholder="bijli, power, electricity..." />
            </div>
            <div className="form-group">
              <label className="form-label">Examples (comma-separated)</label>
              <input className="form-input" value={form.examples} onChange={e => set('examples', e.target.value)} placeholder="pole sparking, power cut..." />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--surface-container)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>{t('deep.priorityRules')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t('deep.defaultPriority')}</label>
                <select className="form-input" value={form.priorityRules.defaultPriority} onChange={e => setPri('defaultPriority', e.target.value)}>
                  {['Critical', 'Urgent', 'Normal', 'Review'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('deep.criticalKeyword')}</label>
                <input className="form-input" value={form.priorityRules.criticalKeywords} onChange={e => setPri('criticalKeywords', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('deep.urgentKeywords')}</label>
                <input className="form-input" value={form.priorityRules.urgentKeywords} onChange={e => setPri('urgentKeywords', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--surface-container)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>{t('deep.sLAHours')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[['criticalHours', 'Critical'], ['urgentHours', 'Urgent'], ['normalHours', 'Normal']].map(([field, label]) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label} Hours</label>
                  <input className="form-input" type="number" min={1} value={form.slaRules[field]} onChange={e => setSla(field, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--surface-container)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>{t('deep.escalationOffic')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[['criticalEscalation', '🔴 Critical'], ['urgentEscalation', '🟡 Urgent'], ['normalEscalation', '🔵 Normal']].map(([field, label]) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form.escalationRules[field]} onChange={e => setEsc(field, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} style={{ width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Active (visible in classifier)</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">{t('deep.cancel')}</button>
            <button type="submit" className="btn btn-secondary" disabled={saving}>
              {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : <><Save size={15} />{t('deep.saveCategory')}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Main Page ── */
export default function TaxonomyStudio() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await taxonomyAPI.getAll();
      setCategories(res.data.categories || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load taxonomy. Check admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    // Transform comma-separated strings back to arrays
    const payload = {
      ...form,
      synonyms: typeof form.synonyms === 'string' ? form.synonyms.split(',').map(s => s.trim()).filter(Boolean) : form.synonyms,
      examples: typeof form.examples === 'string' ? form.examples.split(',').map(s => s.trim()).filter(Boolean) : form.examples,
      priorityRules: {
        ...form.priorityRules,
        criticalKeywords: typeof form.priorityRules.criticalKeywords === 'string' ? form.priorityRules.criticalKeywords.split(',').map(s => s.trim()).filter(Boolean) : form.priorityRules.criticalKeywords,
        urgentKeywords:   typeof form.priorityRules.urgentKeywords   === 'string' ? form.priorityRules.urgentKeywords.split(',').map(s => s.trim()).filter(Boolean)   : form.priorityRules.urgentKeywords,
        normalKeywords:   typeof form.priorityRules.normalKeywords   === 'string' ? form.priorityRules.normalKeywords.split(',').map(s => s.trim()).filter(Boolean)   : form.priorityRules.normalKeywords,
      }
    };
    if (editTarget) {
      await taxonomyAPI.update(editTarget._id, payload);
    } else {
      await taxonomyAPI.create(payload);
    }
    setShowForm(false);
    setEditTarget(null);
    load();
  };

  const handleToggle = async (id) => {
    await taxonomyAPI.toggle(id);
    load();
  };

  const handleDelete = async (id) => {
    await taxonomyAPI.remove(id);
    setDeleteConfirm(null);
    load();
  };

  const handleEdit = (cat) => { setEditTarget(cat); setShowForm(true); };

  const active = categories.filter(c => c.isActive).length;

  return (
    <div className="admin-layout">
      <main className="admin-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--ai-gradient)', borderRadius: 'var(--radius-lg)', color: 'white' }}>
                <Brain size={28} />
              </div>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{t('deep.adaptiveTaxonom')}</h1>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>{t('deep.manageComplaint')}</p>
              </div>
            </div>
            <button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />{t('deep.addCategory')}</button>
          </div>

          {/* Why This Matters card */}
          <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.06), rgba(14,165,164,0.06))', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(14,165,164,0.15)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', color: '#8b5cf6', flexShrink: 0 }}>
              <Shield size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{t('deep.whyThisMatters')}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                When a new civic issue appears, admins can update categories and SLA rules without redeploying CivicTrust.
                The AI engine reads this taxonomy to classify, prioritize, and route complaints dynamically.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Categories', value: categories.length },
              { label: 'Active',           value: active },
              { label: 'Inactive',         value: categories.length - active },
            ].map(s => (
              <div key={s.label} style={{ padding: '1rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{s.value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <div style={{ padding: '1rem', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={18} />
              <p style={{ fontSize: '0.875rem' }}>{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '5rem', borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--on-surface-variant)' }}>
              <Brain size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 600 }}>{t('deep.noTaxonomyCateg')}</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Run <code>npm run seed:taxonomy</code> on the server, or add categories using the button above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categories.map(cat => (
                <TaxonomyCategoryCard
                  key={cat._id}
                  cat={cat}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={(id) => setDeleteConfirm(id)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <TaxonomyCategoryForm
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Delete Category?</h3>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>{t('deep.thisActionIsPer')}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>{t('deep.cancel')}</button>
              <button className="btn btn-primary" style={{ background: 'var(--error)' }} onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={15} />{t('deep.delete')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
