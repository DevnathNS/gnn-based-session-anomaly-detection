import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import WebAuthnRegister from '../components/WebAuthnRegister';

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, marginBottom: 20 };

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api.get('/api/user/settings').then(res => setSettings(res.data.data)).catch(() => {});
  }, []);

  const save = (section) => {
    setSaved(section);
    setTimeout(() => setSaved(''), 2000);
  };

  const planColors = {
    free: { color: 'var(--text2)', label: 'Free' },
    pro: { color: 'var(--accent)', label: 'Pro — $99/month' },
    enterprise: { color: 'var(--teal)', label: 'Enterprise' },
  };
  const pc = planColors[user?.plan || 'free'];

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 32px' }}>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 32 }}>Manage your account, billing, security, and API keys.</p>
	<div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 32px' }}>
      
        <SectionHeader title="Security & Biometrics"/>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
          Register your device biometrics to enable seamless identity verification if your trust score drops.
        </p>
        <WebAuthnRegister />
        {/* Plan & Billing */}
       </div>
      
        <div style={card}>
          <SectionHeader title="Plan & Billing" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, background: 'var(--bg)', borderRadius: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                Current plan: <span style={{ color: pc.color }}>{pc.label}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                {user?.plan === 'free'
                  ? 'Up to 1M events/month, 1 project, community support.'
                  : user?.plan === 'pro'
                  ? 'Up to 500M events/month, 10 projects, priority support.'
                  : 'Unlimited events, dedicated support, custom SLA.'}
              </div>
            </div>
            {user?.plan !== 'enterprise' && (
              <button style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Upgrade →
              </button>
            )}
          </div>
          {settings?.api && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Billing cycle', value: 'Monthly' },
                { label: 'Next invoice', value: 'May 1, 2025' },
                { label: 'API rate limit', value: `${settings.api.rateLimit.toLocaleString()} req/hr` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg)', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div style={card}>
          <SectionHeader title="Security" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Two-factor authentication', desc: '2FA is currently disabled', status: 'Off', action: 'Enable 2FA', danger: false },
              { label: 'Change password', desc: `Last changed: ${settings?.security?.lastPasswordChange || 'Dec 2024'}`, status: null, action: 'Change', danger: false },
              { label: 'Active sessions', desc: `${settings?.security?.activeSessions || 2} sessions currently active`, status: null, action: 'View all', danger: false },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                    {row.label}
                    {row.status && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontWeight: 600 }}>{row.status}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{row.desc}</div>
                </div>
                <button style={{ padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
                  {row.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div style={card}>
          <SectionHeader title="API Keys" />
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Production Key</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--text2)', background: 'var(--surface)', padding: '6px 12px', borderRadius: 6 }}>
                  nxr_live_••••••••••••••••••
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }}>
                  Copy
                </button>
                <button style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', cursor: 'pointer' }}>
                  Rotate
                </button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
              Last rotated: {settings?.api?.lastRotated || 'Jan 15, 2025'} · Rate limit: {settings?.api?.rateLimit?.toLocaleString() || '1,000'} req/hr
            </div>
          </div>
          <button style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            + Generate new key
          </button>
        </div>

        {/* Notifications */}
        <div style={card}>
          <SectionHeader title="Notifications" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Email alerts', desc: 'Critical system alerts sent to your inbox', on: true },
              { label: 'Slack integration', desc: 'Forward alerts to a Slack channel', on: false },
              { label: 'Weekly digest', desc: 'Summary of your pipeline performance every Monday', on: true },
              { label: 'Anomaly detection', desc: 'Be notified when unusual patterns are detected', on: user?.plan !== 'free' },
            ].map((n, i, arr) => (
              <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: user?.plan === 'free' && n.label === 'Anomaly detection' ? 'var(--text3)' : 'var(--text)' }}>
                    {n.label}
                    {n.label === 'Anomaly detection' && user?.plan === 'free' && (
                      <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(79,124,255,0.1)', color: 'var(--accent)', fontWeight: 600 }}>Pro+</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{n.desc}</div>
                </div>
                <div style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: n.on ? 'var(--accent)' : 'var(--surface2)',
                  position: 'relative', opacity: n.label === 'Anomaly detection' && user?.plan === 'free' ? 0.4 : 1,
                  transition: 'background 0.2s',
                }}>
                  <div style={{ position: 'absolute', top: 3, left: n.on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => save('notifications')} style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: saved === 'notifications' ? 'var(--green)' : 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
            {saved === 'notifications' ? '✓ Saved!' : 'Save preferences'}
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ ...card, border: '1px solid rgba(239,68,68,0.25)', marginBottom: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--red)', marginBottom: 20 }}>Danger Zone</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Delete account</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Permanently delete your account and all data. This cannot be undone.</div>
            </div>
            <button style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', cursor: 'pointer' }}
              onClick={() => alert('This is a demo — account deletion is not active.')}>
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 20 }}>{title}</h2>;
}
