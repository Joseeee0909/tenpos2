// api.js
import axios from "axios";
import { readStoredToken, clearStoredAuth } from "../utils/authSession";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" }
});

// 🔐 Añadir token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = readStoredToken();
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
      clearStoredAuth();
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
const createUser = async ({ nombre, username, empresaSlug, email, password, rol }) => {
  const payload = { nombre, username, empresaSlug, email, password, rol };
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

const createRole = async (data) => {
  const res = await api.post("/roles", data);
  return res.data;
};

const updateRole = async (id, data) => {
  const res = await api.put(`/roles/${id}`, data);
  return res.data;
};

const deactivateRole = async (id) => {
  const res = await api.put(`/roles/desactivar/${id}`);
  return res.data;
};

const activateRole = async (id) => {
  const res = await api.put(`/roles/activar/${id}`);
  return res.data;
};

/* ---------------------------------------------------
   🔹 AUTH
--------------------------------------------------- */
const login = async (username, password, empresaSlug) => {
  const res = await api.post("/login", { username, password, empresaSlug });
  return res.data;
};

const register = async (data) => {
  const res = await api.post("/register", data);
  return res.data;
};

// Guardar datos básicos del usuario logueado
const saveUser = (usuario) => {
  try {
    sessionStorage.setItem("usuario", JSON.stringify(usuario));
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
   🔹 MESAS
--------------------------------------------------- */
const getMesas = async () => {
  const res = await api.get("/mesas");
  return res.data;
};

const getMesa = async (id) => {
  const res = await api.get(`/mesas/${id}`);
  return res.data;
};

const crearMesa = async (numero, capacidad = 4) => {
  const res = await api.post("/mesas", { numero, capacidad });
  return res.data;
};

const actualizarMesa = async (id, data) => {
  const res = await api.put(`/mesas/${id}`, data);
  return res.data;
};

const eliminarMesa = async (id) => {
  const res = await api.delete(`/mesas/${id}`);
  return res.data;
};

const inicializarMesas = async () => {
  const res = await api.post("/mesas/init/default");
  return res.data;
};

/* ---------------------------------------------------
   🔹 PEDIDOS
--------------------------------------------------- */
const getPedidos = async () => {
  const res = await api.get("/pedidos");
  return res.data;
};

const getPedido = async (id) => {
  const res = await api.get(`/pedidos/${id}`);
  return res.data;
};

const crearPedido = async (data) => {
  const res = await api.post("/pedidos", data);
  return res.data;
};

const actualizarPedido = async (id, data) => {
  const res = await api.put(`/pedidos/${id}`, data);
  return res.data;
};

const eliminarPedido = async (id) => {
  const res = await api.delete(`/pedidos/${id}`);
  return res.data;
};
/* ---------------------------------------------------
   🔹 REPORTES
--------------------------------------------------- */

// logs
 const getLogs = async (params) => {
  const res = await api.get('/auditoria/logs', { params });
  return res.data;
};

// sesiones
 const getSessions = async () => {
  const res = await api.get('/auditoria/sesiones');
  return res.data;
};

// reporte
 const getReport = async (params) => {
  const res = await api.get('/auditoria/reporte', { params });
  return res.data;
};

// mi historial
 const getMyHistory = async (params) => {
  const res = await api.get('/auditoria/historial', { params });
  return res.data;
};

// evento frontend
export const sendAuditEvent = async (data) => {
  const res = await api.post('/auditoria/eventos', data);
  return res.data;
};

const logAccess = async (data) => {
  const res = await api.post('/auditoria/acceso', data);
  return res.data;
};

/* ---------------------------------------------------
   🔹 VENTAS
--------------------------------------------------- */
const getVentas = async () => {
  const res = await api.get('/ventas');
  return res.data;
};

const getVenta = async (id) => {
  const res = await api.get(`/ventas/${id}`);
  return res.data;
};

const crearVenta = async (data) => {
  const res = await api.post('/ventas', data);
  return res.data;
};

const actualizarVenta = async (id, data) => {
  const res = await api.put(`/ventas/${id}`, data);
  return res.data;
};

const eliminarVenta = async (id) => {
  const res = await api.delete(`/ventas/${id}`);
  return res.data;
};

/* ---------------------------------------------------
   🔹 DASHBOARD
--------------------------------------------------- */
const getDashboardSummary = async () => {
  const res = await api.get('/dashboard/summary');
  return res.data;
};



const getFacturacionConfig = async () => {
  const res = await api.get('/configuracion/facturacion');
  return res.data;
};

const saveFacturacionConfig = async (data) => {
  const res = await api.put('/configuracion/facturacion', data);
  return res.data;
};

const checkoutPedido = async (data) => {
  const res = await api.post('/ventas/checkout', data);
  return res.data;
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
  updateRole,
  deactivateRole,
  activateRole,
  getProducts,
  getTotalUsers,
  getMesas,
  getMesa,
  crearMesa,
  actualizarMesa,
  eliminarMesa,
  inicializarMesas,
  getPedidos,
  getPedido,
  crearPedido,
  actualizarPedido,
  eliminarPedido,
  getFacturacionConfig,
  saveFacturacionConfig,
  checkoutPedido,
  getVentas,
  getVenta,
  crearVenta,
  actualizarVenta,
  eliminarVenta,
  getDashboardSummary,
  getLogs,
  getSessions,
  getReport,
  getMyHistory,
  sendAuditEvent,
  logAccess
};
