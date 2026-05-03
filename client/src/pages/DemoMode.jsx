import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, Zap, ShieldCheck, Clock, UserCheck, Play, Layers, CheckCircle2, AlertCircle, AlertTriangle, FileText, Check, QrCode, Bot } from 'lucide-react';
import PitchScriptCard from '../components/demo/PitchScriptCard';
import api from '../services/api';
import GrievanceReceipt from '../components/citizen/GrievanceReceipt';
import WorkloadBalancerCard from '../components/admin/WorkloadBalancerCard';
import TicketReceipt from '../components/citizen/TicketReceipt';
import { cardReveal, cardStagger, heroReveal, pageRevealProps } from '../utils/pageMotion';

export default function DemoMode() {
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  // Animation state
  const [demoStatus, setDemoStatus] = useState('idle'); // idle, running, complete
  const [activeStepIndex, setActiveStepIndex] = useState(-1);

  // Officer Action state
  const [officerStatus, setOfficerStatus] = useState('pending'); // pending, accepted, dispatched, escalated, resolved

  useEffect(() => {
    const fetchDemo = async () => {
      try {
        const res = await api.get('/demo/scenario');
        setDemoData(res.data);
      } catch (err) {
        console.error('Failed to load demo data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDemo();
  }, []);

  useEffect(() => {
    if (demoStatus === 'running') {
      if (activeStepIndex < 8) {
        const timer = setTimeout(() => {
          setActiveStepIndex(prev => prev + 1);
        }, 1000); // 1s per step for dramatic effect
        return () => clearTimeout(timer);
      } else {
        setDemoStatus('complete');
      }
    }
  }, [demoStatus, activeStepIndex]);

  const runDemo = () => {
    setDemoStatus('running');
    setActiveStepIndex(0);
    setOfficerStatus('pending');
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}><div className="spinner" /></div>;
  }

  if (!demoData) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Demo data not found. Please ensure backend is running.</div>;
  }

  const { demoCitizenComplaint, demoAIAnalysis, demoDuplicateCluster, demoAssignedAuthority, demoBenchmarkSummary } = demoData;

  const demoSteps = [
    { title: "Voice Input Received", icon: Mic, detail: "Hinglish audio processed" },
    { title: "Language Detected", icon: FileText, detail: "Hinglish → English translation" },
    { title: "AI Classification", icon: Zap, detail: "Category: Electricity" },
    { title: "Urgency Engine", icon: AlertTriangle, detail: "Priority marked: Critical" },
    { title: "Policy SLA", icon: Clock, detail: "SLA assigned: 4 hours" },
    { title: "Authority Routing", icon: UserCheck, detail: "Ward 1 Electricity Officer" },
    { title: "Semantic Clustering", icon: LayersIcon, detail: "Duplicate cluster detected" },
    { title: "Audit Logging", icon: ShieldCheck, detail: "Event recorded immutably" },
    { title: "Citizen Tracking", icon: CheckCircle2, detail: "Tracking enabled" }
  ];

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>

      {/* Hero */}
      <motion.div className="animate-page-hero" variants={heroReveal} {...pageRevealProps(shouldReduceMotion)} style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(14,165,164,0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>
          <Play size={16} fill="currentColor" /> Live Demo Mode
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem' }}>CivicTrust AI Demo Mode</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--on-surface-variant)', maxWidth: '600px', margin: '0 auto', marginBottom: '2rem' }}>
          From citizen voice to accountable governance workflow in under 60 seconds.
        </p>

        {demoStatus === 'idle' && (
          <motion.button
            initial={shouldReduceMotion ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            onClick={runDemo}
            className="btn btn-primary btn-lg premium-button-hover"
            style={{ fontSize: '1.125rem', padding: '1rem 2rem', boxShadow: '0 8px 16px rgba(14,165,164,0.2)' }}
          >
            <Play size={20} /> Run Full AI Demo
          </motion.button>
        )}
      </motion.div>

      <motion.div className="animate-card" variants={cardReveal} {...pageRevealProps(shouldReduceMotion)}>
        <PitchScriptCard />
      </motion.div>

      {/* Progress Timeline */}
      {(demoStatus === 'running' || demoStatus === 'complete') && (
        <motion.div initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ margin: '4rem 0' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Live Intelligence Pipeline</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {demoSteps.map((step, i) => {
              const isPast = activeStepIndex > i;
              const isCurrent = activeStepIndex === i;
              const isFuture = activeStepIndex < i;
              const Icon = step.icon;

              let bgColor = 'var(--surface-container)';
              let color = 'var(--outline)';
              let statusText = 'Pending';

              if (isPast) {
                bgColor = 'rgba(16, 185, 129, 0.1)';
                color = '#10b981';
                statusText = 'Complete';
              } else if (isCurrent) {
                bgColor = 'rgba(14, 165, 164, 0.1)';
                color = 'var(--primary)';
                statusText = 'Processing...';
              }

              return (
                <div key={i} className="premium-card-hover" style={{ padding: '1rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--outline-variant)'}`, opacity: isFuture ? 0.6 : 1, transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: bgColor, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isPast ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: color, textTransform: 'uppercase' }}>{statusText}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{step.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{step.detail}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <AnimatePresence>
        {(demoStatus === 'complete' || activeStepIndex >= 2) && (
          <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start', marginTop: '3rem' }}>

            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Complaint Card */}
              <div className="card premium-card-hover" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Citizen Input</h3>
                  <span className="badge" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Mic size={14} /> Voice Recording
                  </span>
                </div>
                <p style={{ fontSize: '1.25rem', lineHeight: 1.6, fontWeight: 500, color: 'var(--on-surface)', fontStyle: 'italic', marginBottom: '1rem' }}>
                  "{demoCitizenComplaint.description}"
                </p>
                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--surface-container)', paddingTop: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>Location</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{demoCitizenComplaint.location.address}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>Citizen</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{demoCitizenComplaint.citizenInfo.name} <span style={{ color: 'var(--outline)' }}>{demoCitizenComplaint.citizenInfo.phone}</span></p>
                  </div>
                </div>
              </div>

              {/* AI Decision Card */}
              <div className="card premium-card-hover" style={{ padding: '2rem', border: '2px solid var(--ai-teal)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--ai-gradient)', borderRadius: '8px', color: 'white' }}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>AI Intelligence Pipeline</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Processed in {demoBenchmarkSummary.averageLatency}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Classification</p>
                    <p style={{ fontSize: '1rem', fontWeight: 800 }}>{demoAIAnalysis.classification.category}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>{demoAIAnalysis.classification.confidence * 100}% Confidence</p>
                  </div>
                  {activeStepIndex >= 3 && (
                    <motion.div initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Urgency Engine</p>
                      <p style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{demoAIAnalysis.urgency.priority}</p>
                      <p style={{ fontSize: '0.8125rem', color: '#ef4444', fontWeight: 600 }}>SLA: {demoAIAnalysis.urgency.slaHours} Hours</p>
                    </motion.div>
                  )}
                </div>

                {activeStepIndex >= 6 && (
                  <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '1rem', background: 'rgba(139,92,246,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139,92,246,0.1)', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Semantic Clustering</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#8b5cf6' }}>Duplicate Detected ({demoDuplicateCluster.similarity * 100}%)</p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', background: '#8b5cf6', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>
                        {demoDuplicateCluster.matchedComplaints} related reports
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#8b5cf6', opacity: 0.8, marginTop: '0.25rem' }}>Cluster ID: {demoDuplicateCluster.clusterId}</p>
                  </motion.div>
                )}

                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Explainable AI Reasoning</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, padding: '1rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                    {demoAIAnalysis.explanation}
                  </p>
                </div>
              </div>

              {/* Human Review Mini Card */}
              <div className="card premium-card-hover" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <AlertCircle size={18} color="#f59e0b" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Human Review Fallback Example</h3>
                </div>
                <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
                  "Problem hai please help"
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="badge" style={{ background: 'var(--surface-container)', color: 'var(--on-surface)' }}>Category: Other</span>
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Priority: Review</span>
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Human Triage Required</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.75rem' }}>Reason: Complaint is unclear and lacks actionable civic keywords.</p>
              </div>

            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Officer Action Panel */}
              {activeStepIndex >= 5 && (
                <motion.div initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card premium-card-hover" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCheck size={20} color="var(--primary)" /> Officer Action Panel
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--primary-container)', color: 'var(--on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                      {demoAssignedAuthority.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '1rem', fontWeight: 700 }}>{demoAssignedAuthority.name}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{demoAssignedAuthority.role}</p>
                    </div>
                    <span className="badge" style={{
                      background: officerStatus === 'resolved' ? 'rgba(16,185,129,0.1)' : officerStatus === 'escalated' ? 'rgba(239,68,68,0.1)' : 'var(--primary-container)',
                      color: officerStatus === 'resolved' ? '#10b981' : officerStatus === 'escalated' ? '#ef4444' : 'var(--on-primary-container)'
                    }}>
                      {officerStatus.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Recommended Action</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem' }}>{demoAIAnalysis.routing.operationalAction}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      onClick={() => setOfficerStatus('accepted')}
                      className="btn btn-outline premium-button-hover"
                      style={{ fontSize: '0.875rem' }}
                      disabled={officerStatus !== 'pending'}
                    >
                      Accept Case
                    </button>
                    <button
                      onClick={() => setOfficerStatus('dispatched')}
                      className="btn btn-primary premium-button-hover"
                      style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                      disabled={officerStatus === 'resolved' || officerStatus === 'pending' || officerStatus === 'escalated'}
                    >
                      Dispatch Field Team
                    </button>
                    <button
                      onClick={() => setOfficerStatus('escalated')}
                      className="btn btn-outline premium-button-hover"
                      style={{ fontSize: '0.875rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                      disabled={officerStatus === 'resolved'}
                    >
                      Escalate
                    </button>
                    <button
                      onClick={() => setOfficerStatus('resolved')}
                      className="btn btn-outline premium-button-hover"
                      style={{ fontSize: '0.875rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
                      disabled={officerStatus !== 'dispatched'}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Before / After */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="premium-card-hover" style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '1rem' }}>Before CivicTrust</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', listStyle: 'none', padding: 0, margin: 0 }}>
                    <li>❌ Manual sorting</li>
                    <li>❌ Misrouting</li>
                    <li>❌ No urgency detection</li>
                    <li>❌ Duplicate tickets</li>
                    <li>❌ No SLA visibility</li>
                    <li>❌ Limited transparency</li>
                  </ul>
                </div>
                <div className="premium-card-hover" style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16,185,129,0.1)' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '1rem' }}>With CivicTrust</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', listStyle: 'none', padding: 0, margin: 0 }}>
                    <li>✅ AI classification</li>
                    <li>✅ Authority-aware routing</li>
                    <li>✅ Policy-backed priority</li>
                    <li>✅ Incident clustering</li>
                    <li>✅ SLA countdown</li>
                    <li>✅ Audit trail & tracking</li>
                  </ul>
                </div>
              </div>

              {/* Benchmark Metrics */}
              <div className="card-flat premium-card-hover" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#10b981" /> Benchmark Performance
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="premium-card-hover" style={{ padding: '1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{demoBenchmarkSummary.classificationAccuracy}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>Classification Accuracy</p>
                  </div>
                  <div className="premium-card-hover" style={{ padding: '1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{demoBenchmarkSummary.criticalRecall}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: 700 }}>Critical Safety Recall</p>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grievance Receipt + Workload Balancer */}
      {demoStatus === 'complete' && (
        <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '4rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>receipt_long</span> Citizen Grievance Receipt
            </h2>
            <GrievanceReceipt
              complaintId={`CT-2026-${String(demoData?.demoCitizenComplaint?.trackingId || 'DEMO').slice(-4).padStart(4, '0')}`}
              category={demoAIAnalysis.classification.category}
              department={demoAIAnalysis.routing.department}
              priority={demoAIAnalysis.urgency.priority}
              sla={`${demoAIAnalysis.urgency.slaHours} hours`}
              assignedOfficer={demoAssignedAuthority.name}
              officerRole={demoAssignedAuthority.role}
              ward={demoAssignedAuthority.ward}
              zone={demoAssignedAuthority.zone}
              status="In Progress"
              submittedAt={new Date().toISOString()}
            />
            <div style={{ marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#8b5cf6' }}>confirmation_number</span> Ticket Receipt
              </h2>
              <TicketReceipt
                ticketId="CT-TKT-2026-0001"
                complaintId={`CT-2026-${String(demoData?.demoCitizenComplaint?.trackingId || 'DEMO').slice(-4).padStart(4, '0')}`}
                category={demoAIAnalysis.classification.category}
                department={demoAIAnalysis.routing.department}
                priority={demoAIAnalysis.urgency.priority}
                sla={`${demoAIAnalysis.urgency.slaHours} hours`}
                assignedOfficer={demoAssignedAuthority.name}
                officerRole={demoAssignedAuthority.role}
                ward={demoAssignedAuthority.ward}
                zone={demoAssignedAuthority.zone}
                status="Field Team Dispatch Pending"
                submittedAt={new Date().toISOString()}
              />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#8b5cf6' }}>balance</span> Department Workload Balancer
            </h2>
            <WorkloadBalancerCard filterDepartment={demoAIAnalysis.classification.category} />
          </div>
        </motion.div>
      )}

      {/* Transparency + Operational Efficiency */}
      <div style={{ marginTop: '5rem', marginBottom: '2rem', padding: '3rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.04), rgba(139,92,246,0.04))', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>Transparency + Operational Efficiency</h2>
          <p style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', maxWidth: '560px', margin: '0 auto' }}>
            CivicTrust builds accountability from the ground up — for citizens and administrators alike.
          </p>
        </div>
        <motion.div className="animate-card-grid" variants={cardStagger} {...pageRevealProps(shouldReduceMotion)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <motion.div className="animate-card" variants={cardReveal}>
          <div className="card premium-card-hover" style={{ padding: '2rem', height: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}>receipt_long</span>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Citizen Receipt</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>Every complaint gets a trackable receipt with SLA, officer and status. Citizens can download or share it in one click.</p>
          </div>
          </motion.div>
          <motion.div className="animate-card" variants={cardReveal}>
          <div className="card premium-card-hover" style={{ padding: '2rem', height: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#8b5cf6', marginBottom: '1rem', display: 'block' }}>balance</span>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Workload Balancer</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>Admin can see officer workload and make smarter assignment decisions to prevent burnout and SLA breaches.</p>
          </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Smart Deployment Layer */}
      <div style={{ marginTop: '5rem', marginBottom: '2rem', padding: '3rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem', color: 'var(--on-surface)' }}>Smart Deployment Layer</h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
            Beyond the core classification engine, CivicTrust provides specialized tooling for citizens and officers.
          </p>
        </div>

        <motion.div className="animate-card-grid" variants={cardStagger} {...pageRevealProps(shouldReduceMotion)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

          <motion.div className="animate-card" variants={cardReveal}>
          <div className="card premium-card-hover" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-2xl)', height: '100%' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(14,165,164,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <QrCode size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--on-surface)' }}>QR Zone Reporting</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem', flex: 1 }}>
              Public QR codes can be placed at schools, hospitals, markets and wards so citizens can report issues with location auto-mapped.
            </p>
            <a href="/qr-zones" className="btn btn-outline premium-button-hover" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-full)' }}>
              View QR Posters
            </a>
          </div>
          </motion.div>

          <motion.div className="animate-card" variants={cardReveal}>
          <div className="card premium-card-hover" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-2xl)', height: '100%' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--ai-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Bot size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--on-surface)' }}>CivicDraft AI</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem', flex: 1 }}>
              Citizens can write rough complaints and CivicDraft AI converts them into formal applications or emergency reports automatically.
            </p>
            <a href="/copilot" className="btn btn-outline premium-button-hover" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-full)' }}>
              Open CivicDraft AI
            </a>
          </div>
          </motion.div>

          <motion.div className="animate-card" variants={cardReveal}>
          <div className="card premium-card-hover" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-2xl)', height: '100%' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <UserCheck size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--on-surface)' }}>Officer Action Assistant</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem', flex: 1 }}>
              Officers receive recommended field actions based on priority, department and SLA to standardize operating procedures.
            </p>
            <a href="/copilot" className="btn btn-outline premium-button-hover" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-full)' }}>
              Try Officer Action Assistant
            </a>
          </div>
          </motion.div>

          <motion.div className="animate-card" variants={cardReveal}>
          <div className="card premium-card-hover" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-2xl)', height: '100%' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>confirmation_number</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--on-surface)' }}>Ticket Tracking</h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '2rem', flex: 1 }}>
              Citizens can track their issue in real-time, receiving SLA updates, officer assignments, and timeline progression.
            </p>
            <a href="/track-ticket" className="btn btn-outline premium-button-hover" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-full)' }}>
              Track a Demo Ticket
            </a>
          </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}

function LayersIcon(props) {
  return <Layers {...props} />;
}
