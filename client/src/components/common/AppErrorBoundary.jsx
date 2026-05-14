import React from 'react';
import { Link } from 'react-router-dom';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('CivicTrust route render failed', error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="page-wrapper page-shell app-warm-bg">
        <main
          className="container page-content"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            maxWidth: '780px',
          }}
        >
          <section className="glass-card" style={{ padding: '2rem', width: '100%', textAlign: 'center' }}>
            <div className="badge badge-error" style={{ marginBottom: '1rem' }}>Page recovery</div>
            <h1 style={{ color: 'var(--on-surface)', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
              This page hit a render issue.
            </h1>
            <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              CivicTrust stayed online instead of showing a blank screen. Try reloading the page or return to a working route.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
              <button type="button" onClick={this.handleRetry} className="btn btn-primary civic-gradient-button">
                Retry Page
              </button>
              <Link to="/" onClick={this.handleRetry} className="btn btn-outline">
                Go Home
              </Link>
              <Link to="/omni-access" onClick={this.handleRetry} className="btn btn-outline">
                OmniAccess
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }
}
