import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState('auth');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [resetForm, setResetForm] = useState({ email: '', token: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demoResetUrl, setDemoResetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const resetToken = searchParams.get('resetToken');
    if (!resetToken) return;

    setAuthMode('reset');
    setIsLogin(true);
    setResetForm(prev => ({ ...prev, token: resetToken }));
    setError('');
    setSuccess('Reset link verified. Create a new password to continue.');
  }, [searchParams]);

  const resetMessages = () => {
    setError('');
    setSuccess('');
    setDemoResetUrl('');
  };

  const switchAuthMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setAuthMode('auth');
    resetMessages();
    setSearchParams({});
  };

  const goToForgotPassword = () => {
    setAuthMode('forgot');
    setResetForm(prev => ({ ...prev, email: form.email }));
    resetMessages();
    setSearchParams({});
  };

  const goToLogin = () => {
    setAuthMode('auth');
    setIsLogin(true);
    setResetForm({ email: '', token: '', password: '', confirmPassword: '' });
    resetMessages();
    setSearchParams({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await login(form.email, form.password);
      } else {
        user = await register(form.name, form.email, form.password, form.phone);
      }
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const email = (resetForm.email || form.email).trim();
      const res = await authAPI.forgotPassword({ email });
      setSuccess(res.data.message || 'If an account exists, password reset instructions have been generated.');

      if (res.data.resetToken) {
        setResetForm(prev => ({ ...prev, email, token: res.data.resetToken }));
        setDemoResetUrl(res.data.resetUrl || '');
        setAuthMode('reset');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (resetForm.password !== resetForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.resetPassword(resetForm.token, { password: resetForm.password });
      setSuccess(res.data.message || 'Password reset successfully. You can now sign in.');
      setForm(prev => ({ ...prev, email: res.data.email || resetForm.email, password: '' }));
      setResetForm({ email: '', token: '', password: '', confirmPassword: '' });
      setDemoResetUrl('');
      setAuthMode('auth');
      setIsLogin(true);
      setSearchParams({});
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reset password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = authMode === 'forgot'
    ? 'Reset Your Password'
    : authMode === 'reset'
    ? 'Create New Password'
    : isLogin
    ? 'Welcome Back'
    : 'Create Account';

  const pageSubtitle = authMode === 'forgot'
    ? 'Enter your email and we will generate a secure reset link.'
    : authMode === 'reset'
    ? 'Choose a new password for your CivicTrust account.'
    : isLogin
    ? 'Sign in to access your grievance dashboard'
    : 'Register to start filing civic grievances';

  const renderStatus = () => (
    <>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>error</span>
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(16,185,129,0.1)',
            color: '#047857',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>check_circle</span>
          {success}
        </motion.div>
      )}
    </>
  );

  return (
    <div className="auth-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-card"
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span className="material-symbols-outlined filled" style={{ color: 'var(--primary)', fontSize: '2rem' }}>account_balance</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>CivicTrust AI</span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{pageTitle}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{pageSubtitle}</p>
        </div>

        {authMode === 'auth' && (
          <div className="auth-toggle">
            <button className={isLogin ? 'active' : ''} onClick={() => switchAuthMode(true)}>Sign In</button>
            <button className={!isLogin ? 'active' : ''} onClick={() => switchAuthMode(false)}>Register</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {authMode === 'auth' && (
            <motion.form
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {!isLogin && (
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    className="form-input"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <label className="form-label" htmlFor="password">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      className="premium-button-hover"
                      onClick={goToForgotPassword}
                      style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  className="form-input"
                  type="password"
                  placeholder={isLogin ? 'Enter your password' : 'Min 6 characters'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number (Optional)</label>
                  <input
                    id="phone"
                    className="form-input"
                    type="tel"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              )}

              {renderStatus()}

              <button
                type="submit"
                className="btn btn-secondary premium-button-hover"
                disabled={loading}
                style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', marginTop: '0.5rem' }}
              >
                {loading ? (
                  <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }}></div>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_forward</span>
                  </>
                )}
              </button>
            </motion.form>
          )}

          {authMode === 'forgot' && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleForgotSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="resetEmail">Account Email</label>
                <input
                  id="resetEmail"
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={resetForm.email}
                  onChange={e => setResetForm({ ...resetForm, email: e.target.value })}
                  required
                />
              </div>

              {renderStatus()}

              <button
                type="submit"
                className="btn btn-secondary premium-button-hover"
                disabled={loading}
                style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem' }}
              >
                {loading ? <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }}></div> : 'Generate Reset Link'}
              </button>

              <button type="button" className="btn btn-ghost premium-button-hover" onClick={goToLogin}>
                Back to Sign In
              </button>
            </motion.form>
          )}

          {authMode === 'reset' && (
            <motion.form
              key="reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleResetSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {demoResetUrl && (
                <div style={{ padding: '0.875rem 1rem', background: 'rgba(14,165,164,0.08)', border: '1px solid rgba(14,165,164,0.18)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                  <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.35rem' }}>Demo reset link generated</p>
                  <p style={{ wordBreak: 'break-all' }}>{demoResetUrl}</p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  className="form-input"
                  type="password"
                  placeholder="Min 6 characters"
                  value={resetForm.password}
                  onChange={e => setResetForm({ ...resetForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  className="form-input"
                  type="password"
                  placeholder="Re-enter new password"
                  value={resetForm.confirmPassword}
                  onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              {renderStatus()}

              <button
                type="submit"
                className="btn btn-secondary premium-button-hover"
                disabled={loading}
                style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem' }}
              >
                {loading ? <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }}></div> : 'Update Password'}
              </button>

              <button type="button" className="btn btn-ghost premium-button-hover" onClick={goToForgotPassword}>
                Request a New Link
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {authMode === 'auth' && isLogin && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Demo Credentials:</p>
            <p>Admin: admin@civictrust.gov / admin123</p>
            <p>Citizen: jane@example.com / citizen123</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
