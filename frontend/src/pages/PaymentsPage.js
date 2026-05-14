import React, { useState } from 'react';
import api from '../utils/api';

export default function PaymentsPage() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [status, setStatus] = useState(null); 

  const handleTransfer = async (e) => {
    e.preventDefault();
    setStatus(null);

    try {
      const res = await api.post('/api/payments/transfer', { 
        amount: Number(amount), 
        to: recipient 
      });
      
      setStatus({ 
        type: 'success', 
        msg: `Successfully transferred $${amount}. Transaction ID: ${res.data.data.transferId}` 
      });
      setAmount('');
      setRecipient('');
      
    } catch (err) {
      const errorPayload = err.response?.data;
      setStatus({ 
          type: 'error',
          msg: errorPayload?.error || errorPayload?.message || 'Transfer blocked by security policy'
        });
    }
  };
  return (
    <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto', color: 'var(--text)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 8 }}>Wire Transfer</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 32 }}>
        Secure payment gateway. <strong style={{ color: 'var(--red)' }}>Requires Trust Score ≥ 90.</strong>
      </p>

      <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--surface)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Recipient Account ID</label>
          <input 
            type="text" 
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="e.g., ACC-12345"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Transfer Amount ($)</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            placeholder="0.00"
          />
        </div>

        <button 
          type="submit"
          style={{ padding: '14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8 }}
        >
          Initiate Transfer
        </button>

        {status && (
          <div style={{ 
            marginTop: 16, padding: 16, borderRadius: 8, 
            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            borderLeft: `4px solid ${status.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
            color: status.type === 'error' ? 'var(--red)' : 'var(--green)'
          }}>
            <p>{status.msg}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
