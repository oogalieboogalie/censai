import React from 'react';
import { api } from '../lib/api.js';

export function Login({ onLoginSuccess, oauthConfigured }) {
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.developerLogin({ email, name });
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      background: 'radial-gradient(1000px 500px at 50% -10%, oklch(0.35 0.08 var(--accent-h) / 0.15), transparent 70%), var(--canvas)',
      zIndex: 9999,
      fontFamily: 'var(--font-sans)',
      color: 'var(--ink)'
    }}>
      <div style={{
        width: 360,
        padding: '36px 32px',
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-app)',
        boxShadow: 'var(--shadow-pop)',
        display: 'grid',
        gap: 24,
        textAlign: 'center',
        animation: 'gen-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Animated Brand Header */}
        <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/assets/app-icon-64.png"
              alt="Censai"
              style={{ width: 34, height: 34, borderRadius: 9, boxShadow: '0 8px 18px -12px oklch(0 0 0 / 0.6)' }}
            />
            <h1 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-sans)',
              color: 'var(--ink)'
            }}>
              Censai
            </h1>
          </div>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--ink-soft)',
            lineHeight: 1.4
          }}>
            I am Genesis. Welcome to the workspace.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px',
            background: 'oklch(0.95 0.05 15 / 0.15)',
            border: '1px solid oklch(0.8 0.1 15 / 0.25)',
            borderRadius: 8,
            fontSize: 12,
            color: 'oklch(0.6 0.15 15)',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {oauthConfigured ? (
          /* Google Sign In Option */
          <div style={{ display: 'grid', gap: 16 }}>
            <a 
              href="/api/auth/google" 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '12px 18px',
                background: 'var(--accent)',
                color: 'var(--bg)',
                textDecoration: 'none',
                borderRadius: 'var(--radius-pill)',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 2px 8px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 8px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.2)';
              }}
            >
              {/* Simple Google SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.483 0-6.309-2.826-6.309-6.309s2.826-6.309 6.309-6.309c1.558 0 2.973.57 4.077 1.503l3.056-3.056C19.23 2.507 15.939 1.5 12.24 1.5c-5.799 0-10.5 4.701-10.5 10.5s4.701 10.5 10.5 10.5c6.126 0 10.875-4.329 10.875-10.5 0-.712-.081-1.397-.225-2.065H12.24z"/>
              </svg>
              Sign in with Google
            </a>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              Secure Google OAuth Authentication
            </span>
          </div>
        ) : (
          /* Developer Bypass Login */
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, textAlign: 'left' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@censai.dev"
                required
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--ink)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--hairline)'}
              />
            </div>
            
            <div style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name (Optional)</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--ink)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--hairline)'}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '11px 16px',
                background: 'var(--accent)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                boxShadow: '0 2px 8px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.15)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 8px oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.15)';
              }}
            >
              {loading ? 'Entering...' : 'Enter Canvas'}
            </button>
            <span style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 4 }}>
              * Developer Mode (Google OAuth is not configured)
            </span>
          </form>
        )}
      </div>
    </div>
  );
}
