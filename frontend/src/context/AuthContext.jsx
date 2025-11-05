import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || null;
    } catch {
      return null;
    }
  });

  // Validate token from localStorage on init: if expired or invalid, ignore it.
  const initialToken = (() => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return null;
      const parts = t.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && typeof payload.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          // expired
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          return null;
        }
      }
      return t;
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      return null;
    }
  })();

  const [token, setToken] = useState(initialToken);

  useEffect(() => {
    // when token changes, validate it; if invalid/expired, clear both
    if (!token) {
      localStorage.removeItem('token');
      return;
    }
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        // token expired
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        return;
      }
      localStorage.setItem('token', token);
    } catch (e) {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('usuario', JSON.stringify(user));
    else localStorage.removeItem('usuario');
  }, [user]);

  const login = ({ token: newToken, usuario }) => {
    if (newToken) setToken(newToken);
    if (usuario) setUser(usuario);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
