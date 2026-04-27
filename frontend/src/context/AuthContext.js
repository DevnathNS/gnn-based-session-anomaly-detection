import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexora_token');
    const savedUser = localStorage.getItem('nexora_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, userId, email: userEmail } = res.data;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('nexora_token', token);

    let role = 'admin'; // default for demo to show admin panel
    let plan = 'pro';
    let name = userEmail;
    try {
      const profileRes = await api.get('/api/user/profile');
      if (profileRes.data?.data) {
        role = profileRes.data.data.role || role;
        name = profileRes.data.data.name || name;
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
    
    const userObj = { id: userId, email: userEmail, name, role, plan };
    localStorage.setItem('nexora_user', JSON.stringify(userObj));
    setUser(userObj);
    return userObj;
  };

  const register = async (name, email, password, company) => {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed', e);
    }
    localStorage.removeItem('nexora_token');
    localStorage.removeItem('nexora_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
