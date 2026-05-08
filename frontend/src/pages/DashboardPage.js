import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import GraphViewer from '../components/GraphViewer';

const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 24,
};
const planBadge = {
  free: { bg: 'rgba(139,147,176,0.15)', color: 'var(--text2)', label: 'Free' },
  pro: { bg: 'rgba(79,124,255,0.15)', color: 'var(--accent)', label: 'Pro' },
  enterprise: { bg: 'rgba(45,228,200,0.15)', color: 'var(--teal)', label: 'Enterprise' },
};

function StatCard({ label, value, unit, change, color = 'var(--accent)' }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: 'var(--text3)' }}>{unit}</span>}
      </div>
      {change && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>↑ {change} vs last week</span>}
    </div>
  );
}

function LockedFeature({ title, desc, plan }) {
  const navigate = useNavigate();
  const colors = { pro: 'var(--accent)', enterprise: 'var(--teal)' };
  return (
    <div style={{
      ...card, opacity: 0.7, position: 'relative', overflow: 'hidden',
      border: '1px dashed var(--border)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 2,
        background: 'rgba(8,12,24,0.7)', backdropFilter: 'blur(4px)',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>{desc}</p>
        <button
          onClick={() => navigate('/pricing')}
          style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: colors[plan] || 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          Upgrade to {plan.charAt(0).toUpperCase() + plan.slice(1)} →
        </button>
      </div>
      <div style={{ filter: 'blur(2px)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{title}</div>
        <div style={{ height: 80, background: 'var(--surface2)', borderRadius: 8 }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    api.get('/api/session/stats')
      .then(res => {
        // Normal behavior: Score is high enough, set data normally
        setData(res.data.data);
      })
      .catch((err) => {
        // Security override: Backend blocked us, but it sent the penalized score!
        const errorPayload = err.response?.data;
        
        if (errorPayload && errorPayload.currentScore !== undefined) {
          // Manually inject the dropped score into the state so the gauge turns red
          setData(prevData => ({
            ...prevData, 
            currentScore: errorPayload.currentScore,
            recentRequests: prevData?.recentRequests || [], // Keep old requests if they exist
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise';
  const isEnt = user?.plan === 'enterprise';
  const badge = planBadge[user?.plan || 'free'];

  const recentRequests = data?.recentRequests || [];

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 4 }}>
              Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>
              Here's what's happening with your data pipelines.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: badge.bg, color: badge.color }}>
              {badge.label} plan
            </span>
            {user?.role === 'admin' && (
              <span style={{ padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: 'var(--red)' }}>
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Trust Score" value={data?.currentScore ?? '---'} color={data?.currentScore > 70 ? 'var(--green)' : 'var(--red)'} />
          <StatCard label="Total Requests" value={data?.recentRequests?.length ?? 0} color="var(--teal)" />
          <StatCard label="Recent Alerts" value={data?.recentRequests?.filter(r => !r.allowed)?.length ?? 0} color="var(--yellow)" />
          <StatCard label="Session Status" value={data?.currentScore > 50 ? 'Active' : 'Locked'} />
        </div>


        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Recent Requests</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentRequests.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 16, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.allowed ? 'var(--green)' : 'var(--red)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{r.method} {r.endpoint}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        {timeSince(r.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: r.allowed ? 'var(--green)' : 'var(--red)' }}>
                      {r.allowed ? 'Allowed' : 'Denied'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Score: {r.trust_score}</div>
                  </div>
                </div>
              ))}
              {recentRequests.length === 0 && <p style={{ fontSize: 13, color: 'var(--text3)' }}>No recent activity.</p>}
            </div>
          </div>
	  

        </div>
        
        {/* Graph Viewer*/}
        <div style={{marginBottom: 24}}>
        	<GraphViewer />
        </div>
        

        {/* Role/plan-specific sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {/* Pro analytics */}
          {isPro ? (
            <div style={card}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>
                ✨ AI Insights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 12, background: 'rgba(79,124,255,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text2)', borderLeft: '3px solid var(--accent)' }}>
                  📈 Event volume is 18% above your 30-day average
                </div>
                <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text2)', borderLeft: '3px solid var(--yellow)' }}>
                  ⚠️ 3 predictive alerts require attention
                </div>
                <div style={{ padding: 12, background: 'rgba(34,197,94,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--text2)', borderLeft: '3px solid var(--green)' }}>
                  💡 2 cost optimizations available
                </div>
              </div>
            </div>
          ) : (
            <LockedFeature title="AI Insights" desc="Get AI-powered anomaly detection and predictive alerts." plan="pro" />
          )}

          {/* Enterprise SSO */}
          {isEnt ? (
            <div style={card}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>
                🏢 Enterprise
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow label="SSO Provider" value="Okta ✓" />
                <InfoRow label="Compliance" value="SOC2 Type II" />
                <InfoRow label="Team Seats" value="48 active" />
                <InfoRow label="Audit Log" value="Enabled" />
              </div>
            </div>
          ) : (
            <LockedFeature title="Enterprise Controls" desc="SSO, audit logs, custom SLAs, and dedicated support." plan="enterprise" />
          )}

          {/* Data export */}
          {isPro ? (
            <div style={card}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>
                📦 Data Export
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.5 }}>
                Export up to 4.2M rows from your pipelines.
              </p>
              <button
                onClick={() => api.get('/api/data/export').then(() => alert('Export queued! Check your email.')).catch(err => alert('Error: ' + (err.response?.data?.error || 'Failed')))}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Export CSV →
              </button>
            </div>
          ) : (
            <LockedFeature title="Data Export" desc="Bulk export your event data as CSV or JSON." plan="pro" />
          )}
        </div>

        {/* Admin quick access */}
        {user?.role === 'admin' && (
          <div style={{
            ...card,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, var(--surface) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
                  🛡️ Admin Panel
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>Manage users, view analytics, and monitor all sessions.</p>
              </div>
              <button
                onClick={() => navigate('/admin')}
                style={{
                  padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'rgba(239,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)',
                  cursor: 'pointer',
                }}
              >
                Open Admin →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function timeSince(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
