import React, { useState } from 'react';
import api from '../utils/api';

export default function TOTPSetup() {
  const [qrCode, setQrCode] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [message, setMessage] = useState('');

  const initiateSetup = async () => {
    try {
      const res = await api.post('/auth/totp/setup');
      setQrCode(res.data.qrCodeUrl);
      setStatus('setup');
      setMessage('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Failed to generate QR code.');
    }
  };

  const verifySetup = async () => {
    try {
      const res = await api.post('/auth/totp/verify-setup', { token });
      if (res.data.success) {
        setStatus('success');
        setMessage('Authenticator App (MFA) enabled successfully!');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Invalid 6-digit code. Try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ padding: 16, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, borderLeft: '4px solid var(--green)' }}>
        <p style={{ color: 'var(--green)', fontWeight: 600 }}>{message}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      {status === 'idle' && (
        <button 
          onClick={initiateSetup}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Setup Multi-Factor Authentication
        </button>
      )}

      {status === 'setup' && (
        <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h4 style={{ marginBottom: 12, color: 'var(--text)' }}>1. Scan this QR Code</h4>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, display: 'inline-block', marginBottom: 20 }}>
            <img src={qrCode} alt="TOTP QR Code" style={{ width: 150, height: 150 }} />
          </div>

          <h4 style={{ marginBottom: 12, color: 'var(--text)' }}>2. Enter the 6-digit code</h4>
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              type="text" 
              maxLength="6"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} // Numbers only
              style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 16, letterSpacing: '0.2em', width: 120, textAlign: 'center' }}
            />
            <button 
              onClick={verifySetup}
              disabled={token.length !== 6}
              style={{ padding: '10px 20px', borderRadius: 8, background: token.length === 6 ? 'var(--green)' : 'var(--surface2)', color: '#fff', border: 'none', cursor: token.length === 6 ? 'pointer' : 'not-allowed', fontWeight: 600 }}
            >
              Verify & Enable
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: 'var(--red)', marginTop: 12, fontSize: 13 }}>{message}</p>
      )}
    </div>
  );
}
