import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const S = {
  page: { paddingTop: 72, overflow: 'hidden' },

  hero: {
    minHeight: '92vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '80px 24px',
    position: 'relative',
  },
  heroBg: {
    position: 'absolute', inset: 0, zIndex: 0,
    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(79,124,255,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroGrid: {
    position: 'absolute', inset: 0, zIndex: 0,
    backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
    maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)',
    WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)',
  },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 16px', borderRadius: 100,
    background: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.3)',
    fontSize: 13, fontWeight: 500, color: 'var(--accent)',
    marginBottom: 32, position: 'relative', zIndex: 1,
    animation: 'fadeUp 0.6s ease forwards',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 1.05,
    letterSpacing: '-0.03em', color: 'var(--text)',
    maxWidth: 900, marginBottom: 24,
    position: 'relative', zIndex: 1,
    animation: 'fadeUp 0.6s 0.1s ease both',
  },
  heroGrad: {
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroSub: {
    fontSize: 18, color: 'var(--text2)', maxWidth: 560, lineHeight: 1.7,
    marginBottom: 40, position: 'relative', zIndex: 1,
    animation: 'fadeUp 0.6s 0.2s ease both',
  },
  heroCtas: {
    display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
    position: 'relative', zIndex: 1,
    animation: 'fadeUp 0.6s 0.3s ease both',
  },
  btnPrimary: {
    padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600,
    background: 'var(--accent)', color: '#fff', cursor: 'pointer',
    border: 'none', transition: 'all 0.2s',
    boxShadow: '0 0 0 0 var(--accent-glow)',
  },
  btnSecondary: {
    padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500,
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', cursor: 'pointer', transition: 'all 0.2s',
  },
  heroLogos: {
    marginTop: 64, position: 'relative', zIndex: 1,
    animation: 'fadeUp 0.6s 0.4s ease both',
  },
  heroLogosLabel: {
    fontSize: 12, fontWeight: 500, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 20,
  },
  heroLogosList: {
    display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap',
  },
  logoItem: {
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
    color: 'var(--text3)', letterSpacing: '-0.5px',
  },

  section: { padding: '100px 32px' },
  sectionInner: { maxWidth: 1280, margin: '0 auto' },
  sectionLabel: {
    fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--accent)',
    marginBottom: 12, display: 'block',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.1,
    letterSpacing: '-0.02em', color: 'var(--text)',
    maxWidth: 600,
  },
  sectionSub: {
    fontSize: 16, color: 'var(--text2)', maxWidth: 520, lineHeight: 1.7,
    marginTop: 16,
  },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 1, background: 'var(--border)',
    border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden',
  },
  statItem: {
    background: 'var(--bg)', padding: '40px 32px',
    textAlign: 'center',
  },
  statNum: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: 42, letterSpacing: '-0.03em', color: 'var(--text)',
  },
  statLabel: { fontSize: 14, color: 'var(--text2)', marginTop: 6 },

  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16, marginTop: 60,
  },
  featureCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '32px',
    transition: 'all 0.3s',
  },
  featureIcon: {
    width: 48, height: 48, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, marginBottom: 20,
  },
  featureTitle: {
    fontFamily: 'var(--font-display)', fontWeight: 700,
    fontSize: 18, color: 'var(--text)', marginBottom: 10,
  },
  featureDesc: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 },

  testimonialGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20, marginTop: 60,
  },
  testimonial: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '28px',
  },
  testimonialQuote: {
    fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24,
  },
  testimonialAuthor: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  tAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
    color: '#fff', flexShrink: 0,
  },
  tName: { fontWeight: 600, fontSize: 14, color: 'var(--text)' },
  tRole: { fontSize: 12, color: 'var(--text3)', marginTop: 2 },

  cta: {
    background: 'var(--bg2)',
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    padding: '100px 32px',
    textAlign: 'center',
    position: 'relative', overflow: 'hidden',
  },
  ctaBg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(79,124,255,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
};

const features = [
  { icon: '⚡', color: '#4f7cff', bg: 'rgba(79,124,255,0.12)', title: 'Real-Time Processing', desc: 'Ingest and process millions of events per second with sub-10ms latency. No batch jobs, no delays.' },
  { icon: '🔒', color: '#2de4c8', bg: 'rgba(45,228,200,0.12)', title: 'Zero-Trust Security', desc: 'End-to-end encryption, fine-grained RBAC, and continuous session monitoring keep your data safe.' },
  { icon: '📈', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', title: 'Predictive Analytics', desc: 'AI-powered insights surface anomalies and trends before they become problems.' },
  { icon: '🔌', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', title: '200+ Integrations', desc: 'Connect to your existing stack in minutes. Kafka, Snowflake, dbt, Databricks, and more.' },
  { icon: '🌍', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', title: 'Global Infrastructure', desc: 'Deploy across 15 regions worldwide. 99.99% uptime SLA backed by financial guarantees.' },
  { icon: '📋', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', title: 'Audit & Compliance', desc: 'SOC 2 Type II, GDPR, HIPAA, and ISO 27001 certified. Full audit logs and data lineage.' },
];

const testimonials = [
  { quote: 'Nexora cut our data pipeline setup from 6 weeks to 2 days. The ROI was almost immediate — we deprecated 3 internal tools in the first month.', name: 'Sarah Chen', role: 'VP Engineering, Meridian Bank', color: '#4f7cff' },
  { quote: "We process 800M events daily through Nexora. The reliability is extraordinary — we haven't had a single incident in 14 months of production usage.", name: 'James Okafor', role: 'CTO, Global Logic', color: '#2de4c8' },
  { quote: "The security features sealed the deal for us. As a healthcare company we need airtight compliance, and Nexora's zero-trust model is best-in-class.", name: 'Dr. Meera Patel', role: 'CISO, HealthBridge Systems', color: '#a855f7' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={S.page}>
      {/* Hero */}
      <section style={S.hero}>
        <div style={S.heroBg} />
        <div style={S.heroGrid} />

        <div style={S.heroBadge}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }} />
          Introducing Nexora Flow — real-time pipelines at any scale
        </div>

        <h1 style={S.heroTitle}>
          The data platform<br />
          <span style={S.heroGrad}>built for what's next</span>
        </h1>

        <p style={S.heroSub}>
          Nexora gives modern enterprises a unified layer for real-time data ingestion,
          processing, and intelligence — without the infrastructure complexity.
        </p>

        <div style={S.heroCtas}>
          <button
            style={S.btnPrimary}
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            onMouseEnter={e => { e.target.style.background = 'var(--accent2)'; e.target.style.boxShadow = '0 0 32px var(--accent-glow)'; }}
            onMouseLeave={e => { e.target.style.background = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 0 var(--accent-glow)'; }}
          >
            {user ? 'Go to Dashboard →' : 'Start for free →'}
          </button>
          <button
            style={S.btnSecondary}
            onClick={() => navigate('/pricing')}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
          >
            View pricing
          </button>
        </div>

        <div style={S.heroLogos}>
          <p style={S.heroLogosLabel}>Trusted by 2,400+ enterprises</p>
          <div style={S.heroLogosList}>
            {['Meridian Bank', 'Global Logic', 'HealthBridge', 'Apex Systems', 'Orion Capital'].map(name => (
              <span key={name} style={S.logoItem}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ ...S.section, paddingTop: 40, paddingBottom: 80 }}>
        <div style={S.sectionInner}>
          <div style={S.statsGrid}>
            {[
              ['4.2T', 'Events processed daily'],
              ['2,400+', 'Enterprise customers'],
              ['99.99%', 'Uptime SLA'],
              ['< 8ms', 'Average latency'],
            ].map(([num, label]) => (
              <div key={num} style={S.statItem}>
                <div style={S.statNum}>{num}</div>
                <div style={S.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={S.section}>
        <div style={S.sectionInner}>
          <span style={S.sectionLabel}>Platform</span>
          <h2 style={S.sectionTitle}>Everything you need, nothing you don't</h2>
          <p style={S.sectionSub}>
            A complete data infrastructure platform built for teams who move fast and can't afford downtime.
          </p>

          <div style={S.featuresGrid}>
            {features.map(f => (
              <div
                key={f.title}
                style={S.featureCard}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border2)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ ...S.featureIcon, background: f.bg }}>
                  {f.icon}
                </div>
                <div style={S.featureTitle}>{f.title}</div>
                <div style={S.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ ...S.section, background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={S.sectionInner}>
          <span style={S.sectionLabel}>Customers</span>
          <h2 style={S.sectionTitle}>Loved by engineering teams at scale</h2>

          <div style={S.testimonialGrid}>
            {testimonials.map(t => (
              <div key={t.name} style={S.testimonial}>
                <div style={{ fontSize: 24, marginBottom: 16 }}>⭐⭐⭐⭐⭐</div>
                <p style={S.testimonialQuote}>"{t.quote}"</p>
                <div style={S.testimonialAuthor}>
                  <div style={{ ...S.tAvatar, background: t.color + '30', color: t.color }}>
                    {t.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div>
                    <div style={S.tName}>{t.name}</div>
                    <div style={S.tRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={S.cta}>
        <div style={S.ctaBg} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-0.03em',
            color: 'var(--text)', marginBottom: 20,
          }}>
            Ready to move faster?
          </h2>
          <p style={{ fontSize: 18, color: 'var(--text2)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Join thousands of engineering teams who ship better data products with Nexora.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              style={S.btnPrimary}
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              onMouseEnter={e => { e.target.style.background = 'var(--accent2)'; }}
              onMouseLeave={e => { e.target.style.background = 'var(--accent)'; }}
            >
              {user ? 'Open Dashboard →' : 'Get started free →'}
            </button>
            <button
              style={S.btnSecondary}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
            >
              Talk to sales
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
