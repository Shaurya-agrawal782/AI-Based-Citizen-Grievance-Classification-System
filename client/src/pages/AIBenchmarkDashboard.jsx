import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity, ShieldAlert, Zap, Clock, Users, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AIBenchmarkDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBenchmark = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/ai/benchmark/results', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error('Failed to load benchmark data. Ensure you have run the backend benchmark script.');
        }

        const jsonData = await res.json();
        setData(jsonData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBenchmark();
  }, []);

  if (loading) {
    return (
      <div className="admin-layout">
        <main className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-layout">
        <main className="admin-content">
          <div style={{ padding: '2rem', background: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldAlert /> Benchmark Data Not Found
            </h2>
            <p>{error || "No data available."}</p>
            <p style={{ marginTop: '1rem', opacity: 0.8 }}>Run <code>npm run benchmark:ai</code> in the server folder first.</p>
          </div>
        </main>
      </div>
    );
  }

  // Prepare chart data
  const langData = Object.keys(data.languageBreakdown).map(lang => ({
    name: lang,
    accuracy: (data.languageBreakdown[lang].correctCategory / data.languageBreakdown[lang].total) * 100
  }));

  const catData = Object.keys(data.categoryBreakdown).map(cat => ({
    name: cat,
    accuracy: (data.categoryBreakdown[cat].correctCategory / data.categoryBreakdown[cat].total) * 100
  }));

  return (
    <div className="admin-layout">
      {/* Detail Content */}
      <main className="admin-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--ai-gradient)', borderRadius: 'var(--radius-lg)', color: 'white' }}>
              <Brain size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                AI Benchmark Command Center
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)' }}>
                Deterministic testing and intelligence evaluation for {data.totalSamples} grievances.
              </p>
            </div>
          </div>

          {/* Top Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <MetricCard
              title="Category Accuracy"
              value={`${data.categoryAccuracy.toFixed(1)}%`}
              icon={<Activity size={20} />}
              color="var(--primary)"
              bg="var(--primary-container)"
            />
            <MetricCard
              title="Critical Case Recall"
              value={`${data.criticalRecall.toFixed(1)}%`}
              icon={<ShieldAlert size={20} />}
              color="var(--error)"
              bg="var(--error-container)"
            />
            <MetricCard
              title="Priority Accuracy"
              value={`${data.priorityAccuracy.toFixed(1)}%`}
              icon={<Zap size={20} />}
              color="#f59e0b"
              bg="rgba(245, 158, 11, 0.1)"
            />
            <MetricCard
              title="Human Review Rate"
              value={`${data.humanReviewRate.toFixed(1)}%`}
              icon={<Users size={20} />}
              color="var(--secondary)"
              bg="var(--secondary-container)"
            />
            <MetricCard
              title="Avg Latency"
              value={`${data.averageLatencyMs.toFixed(2)} ms`}
              icon={<Clock size={20} />}
              color="var(--ai-teal)"
              bg="rgba(14, 165, 164, 0.1)"
            />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
            <div className="card premium-card-hover" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Language Accuracy Breakdown</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={langData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} />
                    <YAxis domain={[0, 100]} fontSize={12} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="accuracy" fill="url(#colorUv)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={1}/>
                        <stop offset="100%" stopColor="var(--ai-teal)" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card premium-card-hover" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Category Classification Accuracy</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} />
                    <YAxis domain={[0, 100]} fontSize={12} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="accuracy" fill="url(#colorPv)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ai-blue)" stopOpacity={1}/>
                        <stop offset="100%" stopColor="var(--secondary)" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Failed Cases Table */}
          <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} className="text-error" /> Misclassified Edge Cases
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
              These samples require human review or model retuning. Only displaying top 15 errors.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-container-high)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0' }}>ID</th>
                  <th style={{ padding: '1rem 0' }}>Snippet</th>
                  <th style={{ padding: '1rem 0' }}>Lang</th>
                  <th style={{ padding: '1rem 0' }}>Expected Cat</th>
                  <th style={{ padding: '1rem 0' }}>Pred Cat</th>
                  <th style={{ padding: '1rem 0' }}>Expected Prio</th>
                  <th style={{ padding: '1rem 0' }}>Pred Prio</th>
                </tr>
              </thead>
              <tbody>
                {data.failedCases.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--surface-container)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: 600 }}>{c.id}</td>
                    <td style={{ padding: '1rem 0', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</td>
                    <td style={{ padding: '1rem 0', fontSize: '0.875rem' }}>{c.language}</td>
                    <td style={{ padding: '1rem 0', fontSize: '0.875rem' }}>{c.expectedCategory}</td>
                    <td style={{ padding: '1rem 0', fontSize: '0.875rem', color: c.expectedCategory !== c.predictedCategory ? 'var(--error)' : 'inherit' }}>{c.predictedCategory}</td>
                    <td style={{ padding: '1rem 0', fontSize: '0.875rem' }}>{c.expectedPriority}</td>
                    <td style={{ padding: '1rem 0', fontSize: '0.875rem', color: c.expectedPriority !== c.predictedPriority ? 'var(--error)' : 'inherit' }}>{c.predictedPriority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

const MetricCard = ({ title, value, icon, color, bg }) => (
  <div className="premium-card-hover" style={{ padding: '1.25rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{title}</span>
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)' }}>
      {value}
    </div>
  </div>
);
