import jwt from "jsonwebtoken";
import Usuario from "../classes/usuario.js";
import prisma from "../lib/prisma.js";
import dotenv from "dotenv";
import { pickFields, toBoolean, toTrimmedString } from "../utils/requestPayload.js";
import { getDefaultEmpresaId } from "../lib/prismaUtils.js";
import { AUDIT_TYPES, recordAuditLog } from "../lib/audit.js";

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("SECRET_KEY environment variable is required");
}

class AuthController {
  static normalizeRegisterPayload(body = {}) {
    const payload = pickFields(body, [
      "idusuario",
      "nombre",
      "username",
      "email",
      "password",
      "rol",
      "activo"
    ]);

    return {
      idusuario: toTrimmedString(payload.idusuario),
      nombre: toTrimmedString(payload.nombre),
      username: toTrimmedString(payload.username),
      email: toTrimmedString(payload.email),
      password: toTrimmedString(payload.password),
      rol: toTrimmedString(payload.rol, "mesero") || "mesero",
      activo: toBoolean(payload.activo, true)
    };
  }

  static normalizeLoginPayload(body = {}) {
    const payload = pickFields(body, ["username", "password", "empresaId", "empresaSlug"]);

    return {
      username: toTrimmedString(payload.username),
      password: toTrimmedString(payload.password),
      empresaId: toTrimmedString(payload.empresaId),
      empresaSlug: toTrimmedString(payload.empresaSlug)
    };
  }

  static async resolveLoginEmpresaId(req, empresaId, empresaSlug) {
    const headerEmpresaId = toTrimmedString(req.headers["x-empresa-id"]);
    const headerEmpresaSlug = toTrimmedString(req.headers["x-empresa-slug"]);
    const requestedEmpresaId = empresaId || headerEmpresaId;
    const requestedEmpresaSlug = empresaSlug || headerEmpresaSlug;

    if (requestedEmpresaId) {
      return requestedEmpresaId;
    }

    if (requestedEmpresaSlug) {
      const empresa = await prisma.empresa.findUnique({
        where: { slug: requestedEmpresaSlug }
      });

      if (!empresa) {
        throw new Error("Empresa no encontrada");
      }

      return empresa.id;
    }

    return getDefaultEmpresaId();
  }

  static async register(req, res) {
    try {
      const {
        idusuario,
        nombre,
        username,
        email,
        password,
        rol,
        activo
      } = AuthController.normalizeRegisterPayload(req.body);

      if (!idusuario || !nombre || !username || !email || !password) {
        return res.status(400).json({
          error: "Faltan campos requeridos"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: "La contraseña debe tener al menos 8 caracteres"
        });
      }

      const empresaId = req.user?.empresaId;

      if (!empresaId) {
        return res.status(403).json({
          error: "No se encontró la empresa del usuario autenticado"
        });
      }

      const nuevoUsuario = new Usuario(
        empresaId,
        idusuario,
        nombre,
        username,
        email,
        password,
        rol,
        activo
      );

      const user = await nuevoUsuario.registrar();

      res.status(201).json({
        mensaje: "Usuario registrado correctamente",
        usuario: {
          id: user.id,
          empresaId: user.empresaId,
          idusuario: user.idusuario,
          nombre: user.nombre,
          username: user.username,
          email: user.email,
          activo: user.activo
        }
      });
    } catch (error) {
      console.error("Error registrando usuario:", error);

      res.status(400).json({
        error: error.message
      });
    }
  }

  static async login(req, res) {
    try {
      const { username, password, empresaSlug } = req.body;

      if (!username || !password || !empresaSlug) {
        return res.status(400).json({
          mensaje: "Username, contraseña y empresa son requeridos" 
        });
      }
      const user = await Usuario.obtenerPorUsuario(username, empresaSlug);
      const resolvedEmpresaId = await AuthController.resolveLoginEmpresaId(req, null, empresaSlug);
          

      if (!user) {
        void recordAuditLog({
          empresaId: resolvedEmpresaId,
          tipo: AUDIT_TYPES.ACCESO,
          accion: "login",
          modulo: "auth",
          detalle: `Intento fallido para ${username}: usuario no encontrado`,
          exito: false,
          nivel: "warn",
          metodo: "POST",
          ruta: "/api/login",
          statusCode: 404,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          metadata: { username }
        }).catch((error) => console.error("Audit login error:", error));

        return res.status(404).json({
          mensaje: "Usuario no encontrado"
        });
      }

      if (!user.activo) {
        void recordAuditLog({
          empresaId: user.empresaId,
          usuarioId: user.id,
          tipo: AUDIT_TYPES.ACCESO,
          accion: "login",
          modulo: "auth",
          detalle: `Intento fallido para ${username}: usuario desactivado`,
          exito: false,
          nivel: "warn",
          metodo: "POST",
          ruta: "/api/login",
          statusCode: 403,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          metadata: { username }
        }).catch((error) => console.error("Audit login error:", error));

        return res.status(403).json({
          mensaje: "Usuario desactivado. Contacte al administrador."
        });
      }

      const valido = await Usuario.validarPassword(
        password,
        user.password
      );

      if (!valido) {
        void recordAuditLog({
          empresaId: user.empresaId,
          usuarioId: user.id,
          tipo: AUDIT_TYPES.ACCESO,
          accion: "login",
          modulo: "auth",
          detalle: `Intento fallido para ${username}: contraseña incorrecta`,
          exito: false,
          nivel: "warn",
          metodo: "POST",
          ruta: "/api/login",
          statusCode: 401,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          metadata: { username }
        }).catch((error) => console.error("Audit login error:", error));

        return res.status(401).json({
          mensaje: "Contraseña incorrecta"
        });
      }

      const rolDoc = user.rolId
        ? await prisma.rol.findUnique({
            where: {
              id: user.rolId
            }
          })
        : null;

      const permisos = Array.isArray(rolDoc?.permisos)
        ? rolDoc.permisos
        : [];

      const token = jwt.sign(
        {
          id: user.id,
          empresaId: user.empresaId,
          username: user.username,
          rol: rolDoc?.nombre || null,
          permisos
        },
        SECRET_KEY,
        {
          expiresIn: "8h"
        }
      );

      res.status(200).json({
        mensaje: "Inicio de sesión exitoso",
        usuario: {
          id: user.id,
          empresaId: user.empresaId,
          idusuario: user.idusuario,
          nombre: user.nombre,
          username: user.username,
          rol: rolDoc?.nombre || null,
          permisos,
          activo: user.activo
        },
        token
      });

      void recordAuditLog({
        empresaId: user.empresaId,
        usuarioId: user.id,
        tipo: AUDIT_TYPES.SESION,
        accion: "login",
        modulo: "auth",
        detalle: `Inicio de sesión de ${user.username}`,
        exito: true,
        nivel: "info",
        metodo: "POST",
        ruta: "/api/login",
        statusCode: 200,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: { username: user.username }
      }).catch((error) => console.error("Audit login error:", error));
    } catch (error) {
      console.error("Error en login:", error);

      res.status(500).json({
        error: error.message
      });
    }
  }

  static async logout(req, res) {
    try {
      res.status(200).json({
        mensaje: "Sesión cerrada correctamente"
      });

      if (req.user?.empresaId) {
        void recordAuditLog({
          empresaId: req.user.empresaId,
          usuarioId: req.user.id || null,
          tipo: AUDIT_TYPES.SESION,
          accion: "logout",
          modulo: "auth",
          detalle: `Cierre de sesión de ${req.user.username || "usuario"}`,
          exito: true,
          nivel: "info",
          metodo: "POST",
          ruta: "/api/logout",
          statusCode: 200,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          metadata: { username: req.user.username }
        }).catch((error) => console.error("Audit logout error:", error));
      }
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
}

export default AuthController;
