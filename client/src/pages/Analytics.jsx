import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI } from '../services/api';

export default function Analytics() {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await grievanceAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors = {
    'Public Infrastructure': { color: '#283593', bg: '#e8eaf6' },
    'Sanitation & Waste': { color: '#2e7d32', bg: '#e8f5e9' },
    'Water Supply': { color: '#1565c0', bg: '#e3f2fd' },
    'Electricity': { color: '#e65100', bg: '#fff3e0' },
    'Public Safety': { color: '#6a1b9a', bg: '#f3e5f5' },
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-header"><h2>Official Panel</h2><p>Resolution Authority</p></div>
        </aside>
        <main className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
        </main>
      </div>
    );
  }

  const maxCategoryCount = Math.max(...(stats?.categoryStats?.map(c => c.count) || [1]));
  const maxDeptTotal = Math.max(...(stats?.departmentStats?.map(d => d.total) || [1]));

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Official Panel</h2>
          <p>Resolution Authority</p>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin" className="sidebar-link"><span className="material-symbols-outlined">grid_view</span>Overview</Link>
          <Link to="/admin" className="sidebar-link"><span className="material-symbols-outlined">description</span>Grievance Feed</Link>
          <Link to="/admin/analytics" className="sidebar-link active"><span className="material-symbols-outlined">analytics</span>Analytics</Link>
          <a href="#" className="sidebar-link"><span className="material-symbols-outlined">alt_route</span>Departmental Routing</a>
          <a href="#" className="sidebar-link"><span className="material-symbols-outlined">settings</span>Settings</a>
        </nav>
        <div className="sidebar-footer">
          <a href="#" className="sidebar-link"><span className="material-symbols-outlined">help_outline</span>Support</a>
          <button onClick={logout} className="sidebar-link" style={{ width: '100%', textAlign: 'left' }}>
            <span className="material-symbols-outlined">logout</span>Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="admin-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Analytics</h1>
            <p style={{ color: 'var(--on-surface-variant)' }}>Comprehensive overview of complaint data and departmental performance.</p>
          </div>

          {/* Top Stats */}
          <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Total Complaints', value: stats?.total || 0, icon: 'inbox' },
              { label: 'Resolution Rate', value: `${stats?.resolutionRate || 0}%`, icon: 'trending_up' },
              { label: 'High Priority', value: stats?.highPriority || 0, icon: 'priority_high' },
              { label: 'AI Classified', value: stats?.aiClassified || 0, icon: 'smart_toy' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
                <div className="stat-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Category Distribution */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Category Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats?.categoryStats?.map((cat, i) => {
                  const colors = categoryColors[cat._id] || { color: '#757682', bg: '#e0e3e5' };
                  return (
                    <motion.div
                      key={cat._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.color }}>{cat._id}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{cat.count}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--surface-container-high)', borderRadius: '4px', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.15 }}
                          style={{ height: '100%', background: colors.color, borderRadius: '4px' }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
                {(!stats?.categoryStats || stats.categoryStats.length === 0) && (
                  <p style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: '2rem' }}>No data available</p>
                )}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Priority Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'High Priority', key: 'high', color: '#bf360c', bg: '#fbe9e7', icon: 'arrow_upward' },
                  { label: 'Medium Priority', key: 'medium', color: '#e65100', bg: '#fff3e0', icon: 'remove' },
                  { label: 'Low Priority', key: 'low', color: '#2e7d32', bg: '#e8f5e9', icon: 'arrow_downward' },
                ].map((p, i) => {
                  const count = stats?.priorityStats?.find(s => s._id === p.key)?.count || 0;
                  const total = stats?.total || 1;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <motion.div
                      key={p.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem', borderRadius: 'var(--radius-md)', background: p.bg,
                      }}
                    >
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                        background: p.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>{p.icon}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: p.color }}>{p.label}</span>
                          <span style={{ fontWeight: 800, color: p.color }}>{count}</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                            style={{ height: '100%', background: p.color, borderRadius: '2px' }}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: p.color, minWidth: '3rem', textAlign: 'right' }}>{percentage}%</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Department Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {stats?.departmentStats?.filter(d => d._id).map((dept, i) => {
                const resRate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                return (
                  <motion.div
                    key={dept._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      padding: '1.25rem', borderRadius: 'var(--radius-xl)',
                      background: 'var(--surface-container-low)', border: '1px solid rgba(197,197,211,0.15)',
                    }}
                  >
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>{dept._id}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{dept.total}</p>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>Total</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{dept.resolved}</p>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>Resolved</p>
                      </div>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface-container-high)', borderRadius: '3px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${resRate}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                        style={{ height: '100%', background: resRate >= 70 ? 'var(--secondary)' : resRate >= 40 ? 'var(--warning)' : 'var(--error)', borderRadius: '3px' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem', textAlign: 'right' }}>
                      Resolution Rate: <span style={{ fontWeight: 700 }}>{resRate}%</span>
                    </p>
                  </motion.div>
                );
              })}
              {(!stats?.departmentStats || stats.departmentStats.filter(d => d._id).length === 0) && (
                <p style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>No department data available</p>
              )}
            </div>
          </div>

          {/* Feasibility Footer */}
          <div style={{
            marginTop: '2rem', padding: '2rem',
            background: 'var(--ai-gradient)', borderRadius: 'var(--radius-xl)', color: 'white',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {[
                { icon: 'smart_toy', title: 'AI + NLP Powered', desc: 'Built with existing AI & NLP tech' },
                { icon: 'cloud', title: 'Scalable Cloud', desc: 'Scalable for high data volume' },
                { icon: 'security', title: 'Strong Security', desc: 'End-to-end encryption' },
                { icon: 'loop', title: 'Continuous Learning', desc: 'Feedback-driven improvement' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', opacity: 0.9 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{item.title}</p>
                    <p style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
