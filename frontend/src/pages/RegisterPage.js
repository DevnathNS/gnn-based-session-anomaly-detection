import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const labelStyle = { display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--text2)' };
const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
  background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s',
};

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.company);
      // Auto-login after register
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '100px 24px 60px', background: 'var(--bg)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(45,228,200,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>N</div>
            Nexora
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Start with the free plan — no credit card required</p>
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['1M events free', 'No credit card', 'Cancel anytime'].map(b => (
            <span key={b} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
              <span style={{ color: 'var(--green)' }}>✓</span> {b}
            </span>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#ef4444' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full name *</label>
                <input type="text" required placeholder="Jane Smith" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input type="text" placeholder="Acme Inc" value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Work email *</label>
              <input type="email" required placeholder="jane@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label style={labelStyle}>Password *</label>
              <input type="password" required placeholder="Minimum 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              {form.password.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: form.password.length >= i * 2 ? (form.password.length >= 8 ? 'var(--green)' : 'var(--yellow)') : 'var(--surface2)' }} />
                  ))}
                </div>
              )}
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
              {loading ? 'Creating account…' : 'Create free account →'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
              By creating an account you agree to our{' '}
              <a href="#" style={{ color: 'var(--text2)' }}>Terms of Service</a> and{' '}
              <a href="#" style={{ color: 'var(--text2)' }}>Privacy Policy</a>.
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
