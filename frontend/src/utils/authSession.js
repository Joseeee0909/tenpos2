const TOKEN_KEY = 'token';
const USER_KEY = 'usuario';

const decodeBase64Url = (value) => {
  if (!value) return null;
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const normalizeRole = (role) => {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'administrador') return 'admin';
  return raw;
};

export const decodeTokenPayload = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  return decodeBase64Url(parts[1]);
};

export const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp < Math.floor(Date.now() / 1000);
};

export const buildUserFromToken = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;

  return {
    username: payload.username || '',
    rol: payload.rol || '',
    permisos: Array.isArray(payload.permisos) ? payload.permisos : []
  };
};

export const readStoredToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || isTokenExpired(token)) return null;
    return token;
  } catch {
    return null;
  }
};

export const writeStoredToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
};

export const readStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeStoredUser = (user) => {
  try {
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(USER_KEY);
  } catch {
    // no-op
  }
};

export const clearStoredAuth = () => {
  writeStoredToken(null);
  writeStoredUser(null);
};