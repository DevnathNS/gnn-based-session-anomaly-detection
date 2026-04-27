import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      padding: '60px 32px 40px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 48, marginBottom: 48,
        }}>
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
              color: 'var(--text)', marginBottom: 16,
            }}>
              <div style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
                borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff',
              }}>N</div>
              Nexora
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
              The intelligent data platform trusted by 2,400+ enterprises worldwide.
              Built for scale, designed for humans.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {['𝕏', 'in', '⬡'].map((icon, i) => (
                <div key={i} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: 'var(--text2)', cursor: 'pointer',
                }}>
                  {icon}
                </div>
              ))}
            </div>
          </div>

          {[
            { title: 'Product', links: ['Platform', 'Pricing', 'Changelog', 'Roadmap', 'Status'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Compliance', 'Cookies'] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--text3)', marginBottom: 16,
              }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" style={{
                      color: 'var(--text2)', fontSize: 14, transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => e.target.style.color = 'var(--text)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text2)'}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>
            © 2025 Nexora, Inc. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
              marginTop: 6,
            }} />
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
