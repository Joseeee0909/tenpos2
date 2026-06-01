import jwt from "jsonwebtoken";
import Usuario from "../classes/usuario.js";
import prisma from "../lib/prisma.js";
import dotenv from "dotenv";
import { pickFields, toBoolean, toTrimmedString } from "../utils/requestPayload.js";
import { getDefaultEmpresaId } from "../lib/prismaUtils.js";

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

  // ============================
  // REGISTRO
  // ============================
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

  // ============================
  // LOGIN
  // ============================
  static async login(req, res) {
    try {
      const { username, password, empresaId, empresaSlug } =
        AuthController.normalizeLoginPayload(req.body);

      if (!username || !password) {
        return res.status(400).json({
          mensaje: "Username y contraseña son requeridos"
        });
      }

      const resolvedEmpresaId = await AuthController.resolveLoginEmpresaId(req, empresaId, empresaSlug);
      const user = await Usuario.obtenerPorUsuario(username, resolvedEmpresaId);

      if (!user) {
        return res.status(404).json({
          mensaje: "Usuario no encontrado"
        });
      }

      if (!user.activo) {
        return res.status(403).json({
          mensaje: "Usuario desactivado. Contacte al administrador."
        });
      }

      const valido = await Usuario.validarPassword(
        password,
        user.password
      );

      if (!valido) {
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

    } catch (error) {
      console.error("Error en login:", error);

      res.status(500).json({
        error: error.message
      });
    }
  }

  // ============================
  // LOGOUT
  // ============================
  static async logout(req, res) {
    try {
      res.status(200).json({
        mensaje: "Sesión cerrada correctamente"
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
}

export default AuthController;
