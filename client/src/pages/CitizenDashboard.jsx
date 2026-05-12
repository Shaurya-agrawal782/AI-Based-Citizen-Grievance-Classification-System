import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI } from '../services/api';

const categoryIcons = {
  'Public Infrastructure': { icon: 'construction', class: 'infrastructure' },
  'Sanitation & Waste': { icon: 'delete', class: 'sanitation' },
  'Water Supply': { icon: 'water_drop', class: 'water' },
  'Electricity': { icon: 'bolt', class: 'electricity' },
  'Public Safety': { icon: 'shield', class: 'safety' },
};

const statusLabels = {
  submitted: 'Submitted',
  'in-review': 'In Review',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
  reopened: 'Reopened',
  closed: 'Closed',
};

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, grievancesRes] = await Promise.all([
        grievanceAPI.getStats(),
        grievanceAPI.getAll({ limit: 10 }),
      ]);
      setStats(statsRes.data);
      setGrievances(grievancesRes.data.grievances);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
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

  if (loading) {
    return (
      <div className="page-shell app-warm-bg">
        <div className="container page-content" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell app-warm-bg">
      <div className="container page-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="warm-accent-card"
          style={{ marginBottom: '2rem', padding: '2rem' }}
        >
          <div className="badge badge-ai" style={{ marginBottom: '0.85rem' }}>
            CivicTrust Command Center
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.45rem' }}>
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)', maxWidth: '680px' }}>
            Monitor tickets, SLA status and recent civic grievance activity.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link to="/grievance/new">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-primary civic-gradient-button">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add</span>
                File New Grievance
              </motion.button>
            </Link>
            <Link to="/track">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-outline warm-outline-button">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>manage_search</span>
                Track Complaint
              </motion.button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
          {[
            { label: 'Total Filed', value: stats?.total || 0, icon: 'description', variant: '' },
            { label: 'In Progress', value: stats?.inProgress || 0, icon: 'pending_actions', variant: 'stat-primary' },
            { label: 'Resolved', value: stats?.resolved || 0, icon: 'check_circle', variant: 'stat-success' },
            { label: 'Escalated', value: stats?.escalated || 0, icon: 'warning', variant: 'stat-warning' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`stat-card premium-card-hover ${stat.variant}`}
            >
              <div className="stat-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{stat.icon}</span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Your Recent Grievances</h2>
          </div>

          {grievances.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline)', marginBottom: '1rem', display: 'block' }}>inbox</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No grievances filed yet</h3>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Start by filing your first civic grievance</p>
              <Link to="/grievance/new" className="btn btn-primary civic-gradient-button">File a Grievance</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {grievances.map((g, i) => {
                const catInfo = categoryIcons[g.category] || { icon: 'help', class: 'infrastructure' };
                return (
                  <motion.div
                    key={g._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="grievance-item premium-card-hover"
                  >
                    <div className={`grievance-icon ${catInfo.class}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{catInfo.icon}</span>
                    </div>
                    <div className="grievance-info">
                      <div className="grievance-title">{g.title}</div>
                      <div className="grievance-meta">
                        <span>ID: {g.trackingId}</span>
                        <span>|</span>
                        <span>{timeAgo(g.createdAt)}</span>
                      </div>
                    </div>
                    <div className="grievance-actions">
                      <span className={`badge badge-${g.status}`}>{statusLabels[g.status]}</span>
                      <span className={`badge badge-${g.priority}`}>{g.priority}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
