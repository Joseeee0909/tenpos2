import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'clave_secreta_temporal';

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload; // { username, rol }
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
