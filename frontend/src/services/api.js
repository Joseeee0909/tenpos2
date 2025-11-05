// axiosConfig.js
import axios from 'axios';

// URL base de tu backend
const API_URL = 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  }
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      // Solo redirigir si no estamos ya en login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
const login = async (username, password) => {
  const response = await axiosInstance.post('/login', { username, password });
  return response.data;
};

const saveUser = (usuario) => {
  try {
    localStorage.setItem('usuario', JSON.stringify(usuario));
  } catch (e) {
    console.warn('No se pudo guardar usuario en localStorage', e);
  }
};

const register = async ({ nombre, username, password, email, rol }) => {
  // El backend espera { username, email, password, rol }
  const payload = { nombre, username, email, password, rol };
  const response = await axiosInstance.post('/register', payload);
  return response.data;
};

export default {
  axios: axiosInstance,
  login,
  saveUser,
  register,
};