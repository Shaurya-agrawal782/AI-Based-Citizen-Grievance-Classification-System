import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Users, AlertCircle, CheckCircle, Clock,
  Filter, Download, Search, LayoutDashboard, FileText, Settings, HelpCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const categoryIcons = {
  'Public Infrastructure': { icon: 'construction', class: 'infrastructure' },
  'Sanitation & Waste': { icon: 'delete', class: 'sanitation' },
  'Water Supply': { icon: 'water_drop', class: 'water' },
  'Electricity': { icon: 'bolt', class: 'electricity' },
  'Public Safety': { icon: 'shield', class: 'safety' },
};

const statusLabels = {
  'submitted': 'Submitted', 'in-review': 'In Review', 'in-progress': 'In Progress',
  'resolved': 'Resolved', 'escalated': 'Escalated', 'reopened': 'Reopened', 'closed': 'Closed',
};

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState('overview');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [statsRes, grievancesRes] = await Promise.all([
        grievanceAPI.getStats(),
        grievanceAPI.getAll({ ...filter, limit: 20 })
      ]);
      setStats(statsRes.data);
      setGrievances(grievancesRes.data.grievances);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const sidebarLinks = [
    { id: 'overview', icon: 'grid_view', label: 'Overview' },
    { id: 'feed', icon: 'description', label: 'Grievance Feed' },
    { id: 'map', icon: 'map', label: 'Live Crisis Map', path: '/admin/map' },
    { id: 'analytics', icon: 'analytics', label: 'Analytics', path: '/admin/analytics' },
    { id: 'routing', icon: 'alt_route', label: 'Departmental Routing' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ];

  if (loading) {
    return (
      <div className="page-shell app-warm-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="admin-layout page-shell app-warm-bg">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Official Panel</h2>
          <p>Resolution Authority</p>
        </div>

        <Link to="/grievance/new" style={{ display: 'block', marginBottom: '1.5rem' }}>
          <button className="btn btn-secondary" style={{ width: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add</span>
            New Grievance
          </button>
        </Link>

        <nav className="sidebar-nav">
          {sidebarLinks.map(link => (
            <Link
              key={link.id}
              to={link.path || '/admin'}
              className={`sidebar-link ${activeSidebarItem === link.id ? 'active' : ''}`}
              onClick={() => setActiveSidebarItem(link.id)}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="sidebar-link">
            <span className="material-symbols-outlined">help_outline</span>
            Support
          </a>
          <button onClick={logout} className="sidebar-link" style={{ width: '100%', textAlign: 'left' }}>
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="warm-accent-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', padding: '2rem' }}>
            <div>
              <div className="badge badge-ai" style={{ marginBottom: '0.85rem' }}>CivicTrust Command Center</div>
              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.45rem' }}>Overview</h1>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '1.05rem', maxWidth: '720px' }}>Monitor tickets, SLA status and recent civic grievance activity.</p>
            </div>
            <button className="btn btn-outline warm-outline-button">
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>download</span>
              Export Summary
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Total Complaints', value: stats?.total || 0, icon: 'inbox', variant: '' },
              { label: 'AI Classified', value: stats?.aiClassified || 0, icon: 'smart_toy', variant: 'stat-primary' },
              { label: 'Pending Review', value: stats?.pendingReview || 0, icon: 'pending_actions', variant: 'stat-warning' },
              { label: 'Resolved', value: stats?.resolved || 0, icon: 'check_circle', variant: 'stat-success' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`stat-card premium-card-hover ${stat.variant}`}
              >
                <div className="stat-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
                </div>
                <div className="stat-value">{stat.value.toLocaleString()}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* New Command Center Card */}
          <div style={{ marginBottom: '2.5rem' }}>
            <Link to="/admin/map" style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ y: -5, boxShadow: '0 10px 40px rgba(14,165,164,0.2)' }}
                className="warm-accent-card"
                style={{
                  padding: '2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', right: '-10%', top: '-20%', opacity: 0.07, color: 'var(--primary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15rem' }}>map</span>
                </div>
                <div>
                  <div className="badge badge-in-progress" style={{ marginBottom: '0.75rem' }}>Live Civic Intelligence</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Geospatial Command Center</h2>
                  <p style={{ color: 'var(--on-surface-variant)', maxWidth: '500px' }}>Access real-time intelligence mapping and cluster analysis. Visualize high-priority hotspots across the city.</p>
                  <button className="btn btn-primary civic-gradient-button" style={{ marginTop: '1.5rem' }}>
                    Launch Live Map
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{stats?.highPriority || 0}</p>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Critical Hotspots</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-2" style={{ marginBottom: '2.5rem' }}>
            <div className="chart-container">
              <h3 className="chart-title">Grievance Trends (Last 6 Months)</h3>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.monthlyTrends || []}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-container-high)" />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                    <Area type="monotone" dataKey="resolved" stroke="var(--secondary)" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container">
              <h3 className="chart-title">Department Distribution</h3>
              <div style={{ height: '240px', display: 'flex' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.categoryStats || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="_id"
                    >
                      {stats?.categoryStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#1E3A8A', '#0EA5A4', '#1b6d24', '#e65100', '#6a1b9a'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem', paddingLeft: '1rem' }}>
                   {stats?.categoryStats?.slice(0, 5).map((item, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ['#1E3A8A', '#0EA5A4', '#1b6d24', '#e65100', '#6a1b9a'][i % 5] }} />
                       <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>{item._id}</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'All', value: '' },
              { label: 'Submitted', value: 'submitted' },
              { label: 'In Review', value: 'in-review' },
              { label: 'In Progress', value: 'in-progress' },
              { label: 'Escalated', value: 'escalated' },
              { label: 'Resolved', value: 'resolved' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter({ ...filter, status: f.value })}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  background: filter.status === f.value ? 'var(--primary)' : 'var(--surface-container)',
                  color: filter.status === f.value ? 'white' : 'var(--on-surface-variant)',
                  border: filter.status === f.value ? '1px solid var(--primary)' : '1px solid rgba(254,215,170,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* High Priority Queue */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
              {filter.status ? `${statusLabels[filter.status] || 'All'} Grievances` : 'High Priority AI Queue'}
            </h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
              View Full Queue →
            </span>
          </div>

          {/* Grievance List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {grievances.map((g, i) => {
              const catInfo = categoryIcons[g.category] || { icon: 'help', class: 'infrastructure' };
              return (
                <motion.div
                  key={g._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="grievance-item premium-card-hover"
                  onClick={() => navigate(`/admin/grievance/${g._id}`)}
                >
                  <div className={`grievance-icon ${catInfo.class}`}>
                    <span className="material-symbols-outlined">{catInfo.icon}</span>
                  </div>
                  <div className="grievance-info">
                    <div className="grievance-title">{g.title}</div>
                    <div className="grievance-meta">
                      <span style={{ fontWeight: 500 }}>
                        {g.description?.substring(0, 80)}{g.description?.length > 80 ? '...' : ''}
                      </span>
                    </div>
                    <div className="grievance-meta" style={{ marginTop: '0.25rem' }}>
                      <span>ID: {g.trackingId}</span>
                      <span>•</span>
                      <span>{timeAgo(g.createdAt)}</span>
                      {g.aiClassification?.sentiment && (
                        <>
                          <span>•</span>
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: g.aiClassification.sentiment === 'urgent/angry' ? 'var(--error)' : 'var(--on-surface-variant)',
                            fontWeight: g.aiClassification.sentiment === 'urgent/angry' ? 700 : 500
                          }}>
                            {g.aiClassification.sentiment === 'urgent/angry' ? <AlertCircle size={12} /> : <Sparkles size={12} />}
                            {g.aiClassification.sentiment}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grievance-actions">
                    {g.aiClassification?.suggestedDepartment && (
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.72)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: g.aiClassification.isUrgent ? '1px solid var(--error)' : '1px solid rgba(226,232,240,0.7)'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: g.aiClassification.isUrgent ? 'var(--error)' : 'var(--on-surface-variant)' }}>
                          {g.aiClassification.isUrgent ? 'priority_high' : 'smart_toy'}
                        </span>
                        <div>
                          <p style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--on-surface-variant)' }}>AI Route</p>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{g.aiClassification.suggestedDepartment}</p>
                        </div>
                      </div>
                    )}
                    <span className={`badge badge-${g.status}`}>
                      {g.status === 'escalated' && <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}>priority_high</span>}
                      {statusLabels[g.status]}
                    </span>
                    <span className="material-symbols-outlined" style={{ color: 'var(--outline)', fontSize: '1.25rem' }}>chevron_right</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
