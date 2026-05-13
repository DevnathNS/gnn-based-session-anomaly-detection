import React, { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import api from '../utils/api';

export default function WebAuthnRegister() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setMessage('');

    try {
      const optionsResponse = await api.post('/auth/webauthn/register-options');
      const options = optionsResponse.data;

      const credential = await startRegistration({ optionsJSON: options });

      const verifyResponse = await api.post('/auth/webauthn/register-verify', {
        credential
      });

      if (verifyResponse.data.success) {
        setMessage('✅ Biometric authentication registered successfully!');
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Registration failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <button 
        onClick={handleRegister} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          background: 'var(--teal)',
          color: '#fff',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600
        }}
      >
        {loading ? 'Processing...' : 'Register Fingerprint / FaceID'}
      </button>
      {message && <p style={{ marginTop: 10, fontSize: 13 }}>{message}</p>}
    </div>
  );
}
