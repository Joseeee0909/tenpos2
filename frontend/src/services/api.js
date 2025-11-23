// api.js
import axios from "axios";

const API_URL = "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" }
});

// 🔐 Añadir token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ❗ Manejo automático de expiración de sesión
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/* ---------------------------------------------------
   🔹 USUARIOS - CRUD COMPLETO
--------------------------------------------------- */

// Obtener usuarios
const getUsers = async () => {
  const res = await api.get("/usuarios");
  return res.data
};

// Crear usuario
const createUser = async ({ nombre, username, email, password, rol }) => {
  const payload = { nombre, username, email, password, rol };
  const res = await api.post("/usuarios", payload);
  return res.data;
};

// Actualizar usuario
const updateUser = async (id, data) => {
  const res = await api.put(`/usuarios/${id}`, data);
  return res.data;
};

const deactivateUser = async (id) => {
  const res = await api.put(`/usuarios/desactivar/${id}`);
  return res.data;
};

const activateUser = async (id) => {
  const res = await api.put(`/usuarios/activar/${id}`);
  return res.data;
};


/* ---------------------------------------------------
   🔹 ROLES
--------------------------------------------------- */
const getRoles = async () => {
  const res = await api.get("/roles");
  return res.data.roles;
};

const createRole = async ({ nombre, descripcion }) => {
  const res = await api.post("/roles", { nombre, descripcion });
  return res.data;
};

/* ---------------------------------------------------
   🔹 AUTH
--------------------------------------------------- */
const login = async (username, password) => {
  const res = await api.post("/login", { username, password });
  return res.data;
};

const register = async (data) => {
  const res = await api.post("/register", data);
  return res.data;
};

// Guardar datos básicos del usuario logueado
const saveUser = (usuario) => {
  try {
    localStorage.setItem("usuario", JSON.stringify(usuario));
  } catch (e) {
    console.warn("Error guardando usuario", e);
  }
};

/* ---------------------------------------------------
   🔹 ESTADÍSTICAS
--------------------------------------------------- */
const getProducts = async () => {
  const res = await api.get("/products");
  return res.data.productos
};
// ?.filter(p => p.disponible !== false).length || 0;
const getTotalUsers = async () => {
  const res = await api.get("/usuarios");
  // Si tu backend devuelve un array directamente
  return Array.isArray(res.data) ? res.data.length : (res.data.usuarios?.length || 0);
};


/* ---------------------------------------------------
   🔹 EXPORTAR TODO
--------------------------------------------------- */
export default {
  api,
  login,
  register,
  saveUser,
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  getRoles,
  createRole,
  getProducts,
  getTotalUsers
};
