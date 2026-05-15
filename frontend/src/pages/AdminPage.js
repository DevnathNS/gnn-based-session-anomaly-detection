import React, { useEffect, useState } from "react";
import api from "../utils/api";

const tierColor = (score) => {
  if (score >= 80) return 'var(--green)';
  if (score >= 50) return 'var(--accent)';
  if (score >= 20) return 'var(--yellow, #f59e0b)';
  return 'var(--red)';
};

const tierLabel = (score) => {
  if (score >= 80) return 'Full';
  if (score >= 50) return 'Limited';
  if (score >= 20) return 'Restricted';
  return 'Blocked';
};

const timeAgo = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function AdminPage() {
  const [tab, setTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchSessions = () => {
    api.get("/api/admin/sessions")
      .then(res => setSessions(res.data.data.sessions || []))
      .catch(() => console.log("Failed to fetch sessions"))
      .finally(() => setLoading(false));
  };

  const fetchUsers = () => {
    api.get("/api/admin/users")
      .then(res => setUsers(res.data.data.users || []))
      .catch(() => console.log("Failed to fetch users"));
  };

  useEffect(() => {
    fetchSessions();
    fetchUsers();
    const interval = setInterval(fetchSessions, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const terminateSession = async (sessionId) => {
    try {
      await api.post(`/api/admin/sessions/${sessionId}/terminate`);
      setActionMsg(`Session ${sessionId.slice(0, 8)}… terminated`);
      setTimeout(() => setActionMsg(''), 3000);
      fetchSessions();
    } catch (err) {
      setActionMsg('Failed to terminate session');
    }
  };

  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20
  };

  const thStyle = {
    textAlign: 'left', padding: '10px 14px', fontSize: 12,
    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)', fontWeight: 600
  };

  const tdStyle = {
    padding: '12px 14px', fontSize: 14, color: 'var(--text)',
    borderBottom: '1px solid var(--border)'
  };

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--text)', marginBottom: 4 }}>
          Admin Panel
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 24 }}>
          Monitor active sessions, trust scores, and manage system access.
        </p>

        {actionMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(34, 197, 94, 0.1)', borderLeft: '4px solid var(--green)',
            color: 'var(--green)', fontSize: 13, fontWeight: 600
          }}>
            {actionMsg}
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
          {['sessions', 'users'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text2)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
                Active Sessions ({sessions.filter(s => s.isActive).length})
              </h2>
              <button onClick={fetchSessions} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer'
              }}>
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <p style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>No active sessions</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Session ID</th>
                      <th style={thStyle}>Trust Score</th>
                      <th style={thStyle}>Tier</th>
                      <th style={thStyle}>Req/Min</th>
                      <th style={thStyle}>Started</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.sessionId} style={{ opacity: s.isActive ? 1 : 0.5 }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500 }}>{s.email}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>ID: {s.userId}</div>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>
                          {s.sessionId.slice(0, 8)}…
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: 100,
                            fontSize: 13, fontWeight: 700,
                            background: `${tierColor(s.trustScore)}15`,
                            color: tierColor(s.trustScore)
                          }}>
                            {s.trustScore}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                            color: tierColor(s.trustScore), letterSpacing: '0.05em'
                          }}>
                            {tierLabel(s.trustScore)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>
                          {s.requestRate}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text2)' }}>
                          {timeAgo(s.startedAt)}
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => terminateSession(s.sessionId)}
                            style={{
                              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                              color: 'var(--red)', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            Terminate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div style={card}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 16 }}>
              Registered Users ({users.length})
            </h2>
            {users.length === 0 ? (
              <p style={{ color: 'var(--text3)', padding: 20, textAlign: 'center' }}>No users found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Created</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>{user.id}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{user.email}</td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 100,
                            background: 'rgba(79,124,255,0.1)', color: 'var(--accent)', fontWeight: 600
                          }}>
                            {user.role || 'member'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text2)' }}>
                          {timeAgo(user.created_at)}
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => {
                              api.post(`/api/admin/users/${user.id}/delete`).then(fetchUsers);
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                              background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                              color: 'var(--red)', cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
