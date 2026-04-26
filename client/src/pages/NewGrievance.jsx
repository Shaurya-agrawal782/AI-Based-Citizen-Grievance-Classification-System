import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MapPin, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI, aiAPI } from '../services/api';
import AIAssistant from '../components/AIAssistant';

const categories = [
  { value: 'Public Infrastructure', icon: 'construction', color: '#283593', bg: '#e8eaf6' },
  { value: 'Sanitation & Waste', icon: 'delete', color: '#2e7d32', bg: '#e8f5e9' },
  { value: 'Water Supply', icon: 'water_drop', color: '#1565c0', bg: '#e3f2fd' },
  { value: 'Electricity', icon: 'bolt', color: '#e65100', bg: '#fff3e0' },
  { value: 'Public Safety', icon: 'shield', color: '#6a1b9a', bg: '#f3e5f5' },
];

export default function NewGrievance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [aiClassification, setAiClassification] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const [form, setForm] = useState({
    citizenName: user?.name || '',
    citizenEmail: user?.email || '',
    citizenPhone: user?.phone || '',
    title: '',
    description: '',
    category: '',
    location: '',
    dateOfIncident: '',
  });

  const [isListening, setIsListening] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setForm(prev => ({ ...prev, description: (prev.description + ' ' + finalTranscript).trim() }));
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setForm(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          
          // Reverse geocoding would happen here in a real app
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            if (data.display_name) {
              setForm(prev => ({ ...prev, location: data.display_name }));
            }
          } catch (e) {
            console.error("Reverse geocoding failed", e);
          }
          setIsLocating(false);
        },
        (error) => {
          console.error("Location error", error);
          setIsLocating(false);
        }
      );
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await grievanceAPI.create({
        ...form,
        category: form.category || aiClassification?.suggestedDepartment,
      });
      setSuccess(res.data.grievance);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced AI classification and Duplicate Check
  useEffect(() => {
    if (step !== 2 || (!form.title && !form.description)) return;
    
    const timer = setTimeout(async () => {
      if (form.title.length > 5 || form.description.length > 10) {
        setAiLoading(true);
        setDuplicateLoading(true);
        try {
          // Prepare image data for Gemini Vision
          const aiImages = await Promise.all(files.map(async (file) => {
            if (file.type.startsWith('image/')) {
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
              });
              return { inlineData: { data: base64, mimeType: file.type } };
            }
            return null;
          }));

          const activeImages = aiImages.filter(img => img !== null);

          // Parallel AI classification and Duplicate check
          const [classRes, dupRes] = await Promise.all([
            aiAPI.classify({ 
              title: form.title, 
              description: form.description,
              images: activeImages 
            }),
            aiAPI.checkDuplicate({ title: form.title, description: form.description })
          ]);
          
          setAiClassification(classRes.data);
          setDuplicateInfo(dupRes.data);
        } catch (err) {
          console.error('AI Processing error:', err);
        } finally {
          setAiLoading(false);
          setDuplicateLoading(false);
        }
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [form.title, form.description, step]);

  const canProceed = () => {
    if (step === 1) return form.citizenName && form.citizenEmail;
    if (step === 2) return form.title && form.description;
    return true;
  };

  // Success screen
  if (success) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', maxWidth: '600px', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
          <div style={{
            width: '5rem', height: '5rem', borderRadius: '50%',
            background: 'var(--secondary-container)', color: 'var(--on-secondary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: '2.5rem' }}>check_circle</span>
          </div>
        </motion.div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Grievance Submitted!</h1>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem', fontSize: '1.125rem' }}>
          Your complaint has been filed and is being processed by our AI system.
        </p>
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600 }}>Tracking ID</span>
            <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.125rem' }}>{success.trackingId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>Category</span>
            <span style={{ fontWeight: 600 }}>{success.category}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>Department</span>
            <span style={{ fontWeight: 600 }}>{success.department}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>Priority</span>
            <span className={`badge badge-${success.priority}`}>{success.priority}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">Go to Dashboard</button>
          <button onClick={() => { setSuccess(null); setStep(1); setForm({ ...form, title: '', description: '', category: '', location: '', dateOfIncident: '' }); }} className="btn btn-outline">File Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>New Grievance</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)' }}>
          Please provide the details of your issue to help us route it to the appropriate department.
        </p>
      </motion.div>

      {/* Step Progress */}
      <div style={{ marginBottom: '3rem', position: 'relative', padding: '0 2rem' }}>
        <div className="step-progress">
          <div className="step-progress-bar" />
          <div className="step-progress-fill" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />
          {['Contact', 'Details', 'Review'].map((label, i) => (
            <div key={i} className="step-item">
              <div className={`step-circle ${i + 1 < step ? 'completed' : i + 1 === step ? 'active' : 'pending'}`}>
                {i + 1 < step ? (
                  <span className="material-symbols-outlined filled" style={{ fontSize: '0.875rem' }}>check</span>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`step-label ${i + 1 === step ? 'active' : ''}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Form */}
        <div className="card" style={{ padding: '2rem' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>Contact Information</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenName">Full Name</label>
                    <input id="citizenName" className="form-input" type="text" value={form.citizenName} onChange={e => setForm({ ...form, citizenName: e.target.value })} placeholder="Your full name" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenEmail">Email Address</label>
                    <input id="citizenEmail" className="form-input" type="email" value={form.citizenEmail} onChange={e => setForm({ ...form, citizenEmail: e.target.value })} placeholder="you@example.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="citizenPhone">Phone Number</label>
                    <input id="citizenPhone" className="form-input" type="tel" value={form.citizenPhone} onChange={e => setForm({ ...form, citizenPhone: e.target.value })} placeholder="9876543210" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>Incident Details</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="title">Grievance Title</label>
                    <input id="title" className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Briefly describe the issue" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="description">Detailed Description</label>
                    <div style={{ position: 'relative' }}>
                      <textarea id="description" className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Provide as much detail as possible to assist in resolution..." rows={6} required />
                      <button 
                        onClick={toggleListening}
                        className={`btn-icon ${isListening ? 'animate-pulse' : ''}`}
                        style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: isListening ? 'var(--error)' : 'var(--surface-container-high)', color: isListening ? 'white' : 'var(--primary)' }}
                      >
                        {isListening ? <Mic size={18} /> : <Mic size={18} />}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={14} className="text-ai-teal" />
                      Our AI handles multiple languages and detects sentiment automatically.
                    </p>

                    {/* Duplicate Warning */}
                    <AnimatePresence>
                      {duplicateInfo?.isDuplicate && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ 
                            marginTop: '1rem', 
                            padding: '1rem', 
                            background: 'var(--error-container)', 
                            color: 'var(--on-error-container)', 
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '4px solid var(--error)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <AlertCircle size={18} />
                            <p style={{ fontWeight: 700 }}>Potential Duplicate Detected ({duplicateInfo.similarity}%)</p>
                          </div>
                          <p style={{ marginBottom: '0.75rem', opacity: 0.9 }}>
                            A similar grievance has already been filed: <strong>"{duplicateInfo.existingGrievance.title}"</strong>. 
                            You may want to track the existing issue instead.
                          </p>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                              onClick={() => navigate(`/track?id=${duplicateInfo.existingGrievance.trackingId}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--on-error-container)', border: '1px solid rgba(0,0,0,0.1)' }}
                            >
                              Track Existing Issue
                            </button>
                            <button 
                              onClick={() => setDuplicateInfo(null)}
                              className="btn btn-ghost btn-sm"
                              style={{ opacity: 0.7 }}
                            >
                              File Anyway
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="dateOfIncident">Date of Incident</label>
                      <input id="dateOfIncident" className="form-input" type="date" value={form.dateOfIncident} onChange={e => setForm({ ...form, dateOfIncident: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="location">Location</label>
                      <div style={{ position: 'relative' }}>
                        <input id="location" className="form-input" type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Address or landmark" />
                        <button 
                          onClick={handleDetectLocation}
                          disabled={isLocating}
                          className="btn-icon"
                          style={{ position: 'absolute', top: '50%', right: '0.5rem', transform: 'translateY(-50%)', width: '2rem', height: '2rem' }}
                        >
                          {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category (Optional - AI will suggest)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      {categories.map(cat => (
                        <motion.button
                          key={cat.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setForm({ ...form, category: form.category === cat.value ? '' : cat.value })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                            border: `2px solid ${form.category === cat.value ? cat.color : 'var(--surface-container-high)'}`,
                            background: form.category === cat.value ? cat.bg : 'var(--surface-container-lowest)',
                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: cat.color }}>{cat.icon}</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: form.category === cat.value ? cat.color : 'var(--on-surface-variant)' }}>{cat.value}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div 
                    className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('fileInput').click()}
                  >
                    <input 
                      id="fileInput" 
                      type="file" 
                      multiple 
                      onChange={handleFileSelect} 
                      style={{ display: 'none' }} 
                    />
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: isDragging ? 'var(--primary)' : 'var(--outline)', marginBottom: '0.5rem', display: 'block' }}>
                      {isDragging ? 'download' : 'cloud_upload'}
                    </span>
                    <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                      {isDragging ? 'Drop files now' : 'Drag and drop files here or click to browse'}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Supported formats: JPG, PNG, PDF (Max 5MB)</p>
                  </div>

                  {files.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Selected Files ({files.length})</p>
                      {files.map((file, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-container-high)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>insert_drive_file</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ color: 'var(--error)', padding: '2px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>Review & Submit</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>Contact</p>
                    <p style={{ fontWeight: 600 }}>{form.citizenName}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{form.citizenEmail} {form.citizenPhone && `• ${form.citizenPhone}`}</p>
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>Grievance Title</p>
                    <p style={{ fontWeight: 600, fontSize: '1.125rem' }}>{form.title}</p>
                  </div>
                  <div>
                    <p className="form-label" style={{ marginBottom: '0.5rem' }}>Description</p>
                    <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{form.description}</p>
                  </div>
                  {form.location && (
                    <div>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>Location</p>
                      <p>{form.location}</p>
                    </div>
                  )}
                  {aiClassification && (
                    <div style={{ padding: '1rem', background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(14,165,164,0.05))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(14,165,164,0.15)' }}>
                      <p className="form-label" style={{ marginBottom: '0.5rem' }}>AI Classification</p>
                      <p style={{ fontWeight: 600 }}>
                        {aiClassification.suggestedDepartment}
                        <span className="badge badge-ai" style={{ marginLeft: '0.5rem' }}>
                          {aiClassification.confidence}% Match
                        </span>
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                        Priority: <span className={`badge badge-${aiClassification.priority}`}>{aiClassification.priority}</span>
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-container)' }}>
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="btn btn-outline"
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.4 : 1 }}
            >Back</button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn btn-secondary"
                disabled={!canProceed()}
              >
                Continue to {step === 1 ? 'Details' : 'Review'}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                {loading ? <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }} /> : (
                  <>Submit Grievance <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>send</span></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '80px' }}>
          {/* AI Classification Card */}
          <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem' }}>
            <div style={{
              position: 'absolute', top: '-2rem', right: '-2rem', width: '6rem', height: '6rem',
              background: 'var(--ai-gradient)', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', position: 'relative' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                background: 'var(--ai-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>smart_toy</span>
              </div>
              <div>
                <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Classification</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  {aiLoading ? 'Analyzing description...' : aiClassification ? 'Classification ready' : 'Waiting for input...'}
                </p>
              </div>
            </div>

            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="skeleton" style={{ height: '3.5rem' }} />
                <div className="skeleton" style={{ height: '2rem', width: '60%' }} />
              </div>
            ) : aiClassification ? (
              <div style={{ position: 'relative' }}>
                <div style={{
                  padding: '1rem', background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)', marginBottom: '1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Suggested Route</span>
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 700, color: 'var(--secondary)',
                      background: 'var(--secondary-container)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                    }}>
                      {(aiClassification.confidence || aiClassification.classification?.confidence || 0)}% Match
                    </span>
                  </div>
                  <p style={{ fontSize: '1rem', fontWeight: 600 }}>{aiClassification.suggestedDepartment || aiClassification.classification?.suggestedDepartment || 'Analyzing...'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Sentiment</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>{aiClassification.sentiment || 'Neutral'}</span>
                      {(aiClassification.isUrgent || aiClassification.priority === 'high') && <AlertCircle size={14} color="var(--error)" />}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(197,197,211,0.1)' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Language</p>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{aiClassification.detectedLanguage || 'Detecting...'}</p>
                  </div>
                </div>

                {/* AI Evidence Verification */}
                {aiClassification.verification && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '0.75rem', 
                    background: aiClassification.verification.status === 'verified' ? 'rgba(14,165,164,0.05)' : 'rgba(239,153,0,0.05)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${aiClassification.verification.status === 'verified' ? 'rgba(14,165,164,0.2)' : 'rgba(239,153,0,0.2)'}`
                  }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>Evidence Verification</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: aiClassification.verification?.status === 'verified' ? 'var(--ai-teal)' : 'var(--warning)' }}>
                        {aiClassification.verification?.status === 'verified' ? 'verified' : 'report_problem'}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{(aiClassification.verification?.status || 'Unknown').toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{aiClassification.verification?.reason}</p>
                  </div>
                )}

                {aiClassification.alternatives?.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>Other Possibilities</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {aiClassification.alternatives.map((alt, i) => (
                        <span key={i} style={{
                          padding: '0.25rem 0.75rem', background: 'var(--surface-container)',
                          borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 500, color: 'var(--on-surface-variant)',
                          border: '1px solid rgba(197,197,211,0.2)',
                        }}>{alt.department}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-container)' }}>
                  This classification helps speed up routing but will be reviewed by a human agent before final assignment.
                </p>
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.4, display: 'block', marginBottom: '0.5rem' }}>psychology</span>
                <p style={{ fontSize: '0.8125rem' }}>Start typing your grievance to see AI classification</p>
              </div>
            )}
          </div>

          {/* Guidelines Card */}
          <div className="card-flat" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-container)' }}>info</span>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Submission Guidelines</h3>
            </div>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Ensure location details are as accurate as possible.',
                'Photos significantly reduce investigation time.',
                'Do not include sensitive personal information (e.g., SSN, financial data) in the description.',
              ].map((tip, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)', flexShrink: 0, marginTop: '0.125rem' }}>check_circle</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <AIAssistant context="newGrievance" formContent={form} />
    </div>
  );
}
