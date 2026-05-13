import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AboutPage() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/public/about')
      .then(res => setInfo(res.data.data))
      .catch(err => console.error("Failed to fetch about info:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto', color: 'var(--text)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 20 }}>About This App</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 40 }}>About Nexora.</p>
      
      {loading ? (
        <p>Loading information...</p>
      ) : (
        <div style={{ padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>{info?.appName || 'ZeroTrust Application'}</h2>
          <p style={{ color: 'var(--text3)' }}>Version: {info?.version || '1.0.0'}</p>
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(45, 228, 200, 0.1)', borderRadius: 8, borderLeft: '4px solid var(--teal)' }}>
            <p style={{ color: 'var(--teal)', fontSize: 14, fontWeight: 500 }}>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
