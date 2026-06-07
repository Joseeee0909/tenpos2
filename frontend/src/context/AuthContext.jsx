import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/api';
import {
  buildUserFromToken,
  clearStoredAuth,
  isTokenExpired,
  normalizeRole,
  readStoredToken,
  readStoredUser,
  writeStoredToken,
  writeStoredUser,
  
} from '../utils/authSession';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(() => {
    const storedUser = readStoredUser();
    if (storedUser) return storedUser;
    return token ? buildUserFromToken(token) : null;
  });

  useEffect(() => {
    if (!token) {
      clearStoredAuth();
      return;
    }
    if (isTokenExpired(token)) {
      setToken(null);
      setUser(null);
      clearStoredAuth();
      return;
    }
    writeStoredToken(token);
  }, [token]);

  useEffect(() => {
    if (user) writeStoredUser(user);
    else writeStoredUser(null);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const refreshPerms = async () => {
      if (!token || !user?.rol) return;
      const currentPerms = Array.isArray(user?.permisos) ? user.permisos : [];
      if (currentPerms.length > 0) return;
      try {
        const roles = await authService.getRoles();
        const match = Array.isArray(roles)
          ? roles.find((r) => normalizeRole(r?.nombre) === normalizeRole(user.rol))
          : null;
        const perms = Array.isArray(match?.permisos) ? match.permisos : [];
        const current = Array.isArray(user?.permisos) ? user.permisos : [];
        if (mounted && JSON.stringify(perms) !== JSON.stringify(current)) {
          setUser((prev) => ({ ...prev, permisos: perms }));
        }
      } catch {
        // no-op
      }
    };

    const handleFocus = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      refreshPerms();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [token, user?.rol]);

  const login = ({ token: newToken, usuario }) => {
    if (newToken) setToken(newToken);
    if (usuario) {
      setUser(usuario);
    } else if (newToken) {
      setUser(buildUserFromToken(newToken));
    }
  };

  const logout = async () => {
    try {
    await authService.logout();
  } catch (error) {
    console.error("Error registrando logout:", error);
  }

    setToken(null);
    setUser(null);
    clearStoredAuth();
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
