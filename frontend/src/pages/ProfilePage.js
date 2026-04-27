import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 };
const labelStyle = { display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--text2)' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s' };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', company: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/user/profile').then(res => {
      const d = res.data.data;
      setProfile(d);
      setForm({ name: d.name, company: d.company || '' });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/user/profile', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '';
  const planColors = {
    free: { bg: 'rgba(139,147,176,0.15)', color: 'var(--text2)' },
    pro: { bg: 'rgba(79,124,255,0.15)', color: 'var(--accent)' },
    enterprise: { bg: 'rgba(45,228,200,0.15)', color: 'var(--teal)' },
  };
  const pc = planColors[user?.plan || 'free'];

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 32px' }}>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 4 }}>Your Profile</h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 32 }}>Manage your personal information and preferences.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>

          {/* Left: avatar + plan info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#fff',
              }}>{initials}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{user?.email}</div>
              <div style={{ display: 'inline-flex', marginTop: 12, padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, ...pc }}>
                {user?.plan?.charAt(0).toUpperCase()}{user?.plan?.slice(1)} Plan
              </div>
            </div>

            <div style={card}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Account Info</h3>
              {[
                { label: 'Role', value: user?.role },
                { label: 'Plan', value: user?.plan },
                { label: 'Member since', value: 'Jan 2024' },
                { label: 'Company', value: user?.company || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: 'var(--text3)' }}>{label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
            </div>

            {profile && (
              <div style={card}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Usage This Month</h3>
                {[
                  { label: 'Events', value: '1.24M' },
                  { label: 'API Calls', value: profile.usage?.apiCallsToday?.toLocaleString() ?? '3,420' },
                  { label: 'Projects', value: profile.usage?.activeProjects ?? 2 },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                    <span style={{ color: 'var(--text3)' }}>{label}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: edit form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 24 }}>Personal Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <input type="email" value={user?.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Email cannot be changed. Contact support to update it.</p>
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Your company name" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: saved ? 'var(--green)' : saving ? 'var(--surface2)' : 'var(--accent)',
                    color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>

            <div style={card}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 20 }}>Preferences</h2>
              {[
                { label: 'Email notifications', desc: 'Receive alerts and weekly digests via email', on: true },
                { label: 'Slack alerts', desc: 'Send critical alerts to your Slack workspace', on: false },
                { label: 'Marketing emails', desc: 'Product updates, tips, and special offers', on: true },
              ].map(p => (
                <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <div style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: p.on ? 'var(--accent)' : 'var(--surface2)',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{
                      position: 'absolute', top: 3, left: p.on ? 23 : 3, width: 18, height: 18,
                      borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
