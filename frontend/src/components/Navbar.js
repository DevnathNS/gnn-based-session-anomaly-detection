import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    height: 72,
    display: 'flex', alignItems: 'center',
    padding: '0 32px',
    transition: 'all 0.3s ease',
  },
  navScrolled: {
    background: 'rgba(8,12,24,0.92)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
  },
  inner: {
    maxWidth: 1280, margin: '0 auto', width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22,
    color: 'var(--text)', letterSpacing: '-0.5px',
  },
  logoMark: {
    width: 32, height: 32,
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#fff',
  },
  links: { display: 'flex', alignItems: 'center', gap: 4 },
  link: {
    padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    color: 'var(--text2)', transition: 'all 0.2s',
  },
  linkActive: { color: 'var(--text)', background: 'var(--surface)' },
  actions: { display: 'flex', alignItems: 'center', gap: 12 },
  btnOutline: {
    padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    border: '1px solid var(--border2)', background: 'transparent',
    color: 'var(--text)', transition: 'all 0.2s', cursor: 'pointer',
  },
  btnPrimary: {
    padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    background: 'var(--accent)', color: '#fff', transition: 'all 0.2s', cursor: 'pointer',
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fff',
    cursor: 'pointer', border: '2px solid transparent',
    transition: 'border-color 0.2s',
  },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: 8,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 8, minWidth: 220,
    boxShadow: 'var(--shadow-lg)',
  },
  dropUser: {
    padding: '10px 12px', borderBottom: '1px solid var(--border)',
    marginBottom: 4,
  },
  dropUserName: { fontWeight: 600, fontSize: 14, color: 'var(--text)' },
  dropUserEmail: { fontSize: 12, color: 'var(--text2)', marginTop: 2 },
  dropItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 12px', borderRadius: 8, fontSize: 14,
    color: 'var(--text2)', cursor: 'pointer', transition: 'all 0.15s',
    background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: 'var(--font-body)',
  },
  planBadge: {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600,
    marginLeft: 6,
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDropOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  const planColors = {
    free: { bg: 'rgba(139,147,176,0.15)', color: 'var(--text2)' },
    pro: { bg: 'rgba(79,124,255,0.15)', color: 'var(--accent)' },
    enterprise: { bg: 'rgba(45,228,200,0.15)', color: 'var(--teal)' },
  };

  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0,2) : '';

  return (
    <nav style={{ ...styles.nav, ...(scrolled ? styles.navScrolled : {}) }}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          <div style={styles.logoMark}>N</div>
          Nexora
        </Link>

        {/* Nav Links */}
        <div style={styles.links}>
          {[['/', 'Platform'], ['/news', 'Blog'], ['/about', 'About'], ['/pricing', 'Pricing']].map(([path, label]) => (
            <Link
              key={path}
              to={path}
              style={{ ...styles.link, ...(isActive(path) ? styles.linkActive : {}) }}
              onMouseEnter={e => { if (!isActive(path)) e.target.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!isActive(path)) e.target.style.color = 'var(--text2)'; }}
            >
              {label}
            </Link>
          ))}
          {user && (
            <Link
              to="/dashboard"
              style={{ ...styles.link, ...(isActive('/dashboard') ? styles.linkActive : {}) }}
              onMouseEnter={e => { if (!isActive('/dashboard')) e.target.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!isActive('/dashboard')) e.target.style.color = 'var(--text2)'; }}
            >
              Dashboard
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              style={{ ...styles.link, ...(isActive('/admin') ? styles.linkActive : {}) }}
              onMouseEnter={e => { if (!isActive('/admin')) e.target.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!isActive('/admin')) e.target.style.color = 'var(--text2)'; }}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  ...styles.avatar,
                  ...(dropOpen ? { borderColor: 'var(--accent)' } : {}),
                }}
                onClick={() => setDropOpen(!dropOpen)}
              >
                {initials}
              </div>
              {dropOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                    onClick={() => setDropOpen(false)}
                  />
                  <div style={{ ...styles.dropdown, zIndex: 50 }}>
                    <div style={styles.dropUser}>
                      <div style={styles.dropUserName}>
                        {user.name}
                        <span style={{
                          ...styles.planBadge,
                          ...planColors[user.plan],
                        }}>
                          {user.plan}
                        </span>
                      </div>
                      <div style={styles.dropUserEmail}>{user.email}</div>
                    </div>
                    {[
                      ['/dashboard', '📊', 'Dashboard'],
                      ['/profile', '👤', 'Profile'],
                      ['/settings', '⚙️', 'Settings'],
                      ['/payments', '👤', 'Payments'],
                    ].map(([path, icon, label]) => (
                      <button
                        key={path}
                        style={styles.dropItem}
                        onClick={() => navigate(path)}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--surface2)';
                          e.currentTarget.style.color = 'var(--text)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text2)';
                        }}
                      >
                        <span>{icon}</span> {label}
                      </button>
                    ))}
                    {user.role === 'admin' && (
                      <button
                        style={styles.dropItem}
                        onClick={() => navigate('/admin')}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
                      >
                        <span>🛡️</span> Admin Panel
                      </button>
                    )}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                      <button
                        style={{ ...styles.dropItem, color: 'var(--red)' }}
                        onClick={() => { logout(); navigate('/'); }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>🚪</span> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button
                style={styles.btnOutline}
                onClick={() => navigate('/login')}
                onMouseEnter={e => { e.target.style.background = 'var(--surface)'; }}
                onMouseLeave={e => { e.target.style.background = 'transparent'; }}
              >
                Sign in
              </button>
              <button
                style={styles.btnPrimary}
                onClick={() => navigate('/register')}
                onMouseEnter={e => { e.target.style.background = 'var(--accent2)'; }}
                onMouseLeave={e => { e.target.style.background = 'var(--accent)'; }}
              >
                Get started →
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
