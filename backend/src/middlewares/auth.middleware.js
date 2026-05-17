import jwt from 'jsonwebtoken';
import RolModel from '../models/rol.model.js';

const SECRET_KEY = process.env.SECRET_KEY || 'clave_secreta_temporal';

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload; // { username, rol, permisos }
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRol = req.user?.rol;
    if (!userRol || !roles.includes(userRol)) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }
    next();
  };
}

const normalizeRole = (role) => {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'administrador') return 'admin';
  return raw;
};

export function requirePermission(...permisos) {
  return async (req, res, next) => {
    const rol = normalizeRole(req.user?.rol);
    const isAdmin = ['admin', 'root'].includes(rol);
    if (isAdmin) return next();

    let userPerms = [];
    if (rol) {
      const rolDoc = await RolModel.findOne({ nombre: req.user?.rol });
      userPerms = Array.isArray(rolDoc?.permisos) ? rolDoc.permisos : [];
    }

    if (!userPerms.length) {
      userPerms = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
    }

    const hasPermission = permisos.some((perm) => userPerms.includes(perm));
    if (!hasPermission) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    return next();
  };
}
