import React, { useState, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import api from '../utils/api';

export default function GlobalStepUpModel() {
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState('');
	const [status, setStatus] = useState(null);
	
	useEffect(() => {
		const handleTrigger = (e) => {
			setMessage(e.detail.message);
			setIsOpen(true);
			setStatus(null);
		}
		window.addEventListener('step-up-required', handleTrigger);
		return () => window.removeEventListener('step-up-required',handleTrigger)
	}, []);
	
	const handleVerify = async () => {
		setStatus('loading');
		try {
			const optionsRes = await api.post('/auth/webauthn/step-up-options');
			const credential = await startAuthentication({optionsJSON: optionsRes.data});
			const verifyRes = await api.post('/auth/webauthn/step-up-verify', { credential });
			
			if (verifyRes.data.success) {
				setStatus('success');
				setMessage(`Trust score restored to ${verifyRes.data.newScore}`);
				setTimeout(() => {
					setIsOpen(false);
					window.location.reload();
				}, 2000);
			} 
		} catch (err) {
			console.error(err);
			setStatus('error');
			setMessage('Verification failed, please try again or use PIN fallback')
		} 
	};
	if (!isOpen) return null;
	
	return (<div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--surface)', padding: 32, borderRadius: 16, 
        maxWidth: 400, width: '100%', border: '1px solid var(--border)',
        textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Security Alert</h2>
        <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 24 }}>{message}</p>
        
        {status === 'success' ? (
          <div style={{ color: 'var(--green)', padding: 16, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
            {message}
          </div>
        ) : (
          <button 
            onClick={handleVerify}
            disabled={status === 'loading'}
            style={{ 
              width: '100%', padding: '14px', borderRadius: 8, 
              background: 'var(--accent)', color: '#fff', fontSize: 16, 
              fontWeight: 600, border: 'none', cursor: status === 'loading' ? 'wait' : 'pointer' 
            }}
          >
            {status === 'loading' ? 'Awaiting Sensor...' : 'Verify Identity (Touch ID / Face ID)'}
          </button>
        )}
        
        {status === 'error' && <p style={{ color: 'var(--red)', marginTop: 12 }}>{message}</p>}
        
        <button 
          onClick={() => setIsOpen(false)}
          style={{ marginTop: 16, background: 'transparent', color: 'var(--text3)', border: 'none', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}


