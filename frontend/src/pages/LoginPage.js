import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, verifyMfaLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState('credentials'); // 'credentials' | 'mfa'
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user && user.requiresMFA) {
        setMfaToken(user.mfaToken);
        setStep('mfa');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyMfaLogin(mfaToken, mfaCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Invalid 6-digit code.');
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = (email) => setForm({ email, password: 'password123' });
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '100px 24px 60px',
      background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,124,255,0.1) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s ease' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
            color: 'var(--text)', marginBottom: 24,
          }}>
            <div style={{
              width: 28, height: 28, background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
              borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>N</div>
            Nexora
          </Link>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28,
            letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 8,
          }}>
            {step === 'mfa' ? 'Two-Factor Authentication' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>
            {step === 'mfa' ? 'Enter the 6-digit code from your authenticator app.' : 'Sign in to your Nexora account'}
          </p>
        </div>

        {/* Demo accounts - ONLY SHOW ON CREDENTIAL STEP */}
        {step === 'credentials' && (
          <div style={{
            background: 'rgba(79,124,255,0.08)', border: '1px solid rgba(79,124,255,0.2)',
            borderRadius: 12, padding: 16, marginBottom: 24,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Demo accounts (all passwords: password123)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Admin', email: 'alice@example.com', color: 'var(--teal)' },
                { label: 'Pro member', email: 'bob@example.com', color: 'var(--accent)' },
                { label: 'Free viewer', email: 'carol@example.com', color: 'var(--text2)' },
              ].map(d => (
                <button
                  key={d.email}
                  onClick={() => fillDemo(d.email)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: d.color,
                    background: d.color + '20', padding: '2px 6px', borderRadius: 4,
                    minWidth: 52, textAlign: 'center',
                  }}>{d.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'monospace' }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32,
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20,
              fontSize: 14, color: '#ef4444',
            }}>{error}</div>
          )}

          {/* STEP 1: CREDENTIALS FORM */}
          {step === 'credentials' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email" required
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={labelStyle}>Password</label>
                  <a href="#" style={{ fontSize: 13, color: 'var(--accent)' }}>Forgot password?</a>
                </div>
                <input
                  type="password" required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 600,
                  background: loading ? 'var(--surface2)' : 'var(--accent)',
                  color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', marginTop: 4,
                }}
                onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--accent2)'; }}
                onMouseLeave={e => { if (!loading) e.target.style.background = 'var(--accent)'; }}
              >
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          )}

          {/* STEP 2: MFA FORM */}
          {step === 'mfa' && (
            <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
              <div>
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="000 000"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: '0.2em', padding: '16px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <button type="submit" disabled={loading || mfaCode.length !== 6} style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: (loading || mfaCode.length !== 6) ? 'var(--surface2)' : 'var(--accent)', color: '#fff', border: 'none', cursor: (loading || mfaCode.length !== 6) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: 4 }}>
                {loading ? 'Verifying…' : 'Verify Identity'}
              </button>
              <button type="button" onClick={() => { setStep('credentials'); setError(''); setMfaCode(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
                Cancel and go back
              </button>
            </form>
          )}
        </div>

        {/* Register Link - ONLY SHOW ON CREDENTIAL STEP */}
        {step === 'credentials' && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text2)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Create one free</Link>
          </p>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--text2)',
};
const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
  background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s',
};
