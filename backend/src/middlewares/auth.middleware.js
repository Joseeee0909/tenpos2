import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("SECRET_KEY environment variable is required");
}

export function verifyToken(req, res, next) {
  const authHeader =
    req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, SECRET_KEY);

    // 🔥 SOLO lo que necesitas en request
    req.user = {
      id: payload.id,
      empresaId: payload.empresaId,
      username: payload.username,
      rol: payload.rol,
      permisos: payload.permisos || []
    };

    next();
  } catch (err) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRol = req.user?.rol;

    if (!userRol || !roles.includes(userRol)) {
      return res.status(403).json({ mensaje: "No autorizado" });
    }

    next();
  };
}

const normalizeRole = (role) => {
  const raw = String(role || "").trim().toLowerCase();
  if (raw === "administrador") return "admin";
  return raw;
};

export function requirePermission(...permisos) {
  return (req, res, next) => {
    const rol = normalizeRole(req.user?.rol);
    const isAdmin = ["admin", "root"].includes(rol);

    // 🧠 admins pasan directo
    if (isAdmin) return next();

    const userPerms = Array.isArray(req.user?.permisos)
      ? req.user.permisos
      : [];

    const hasPermission = permisos.some((perm) =>
      userPerms.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({ mensaje: "No autorizado" });
    }

    next();
  };
}