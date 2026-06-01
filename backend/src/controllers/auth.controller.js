import jwt from "jsonwebtoken";
import Usuario from "../classes/usuario.js";
import RolModel from "../models/rol.model.js";
import dotenv from "dotenv";
import { pickFields, toBoolean, toTrimmedString } from "../utils/requestPayload.js";
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error('SECRET_KEY environment variable is required');
}

class AuthController {
  static normalizeRegisterPayload(body = {}) {
    const payload = pickFields(body, ['idusuario', 'nombre', 'username', 'email', 'password', 'rol', 'activo']);

    return {
      idusuario: toTrimmedString(payload.idusuario),
      nombre: toTrimmedString(payload.nombre),
      username: toTrimmedString(payload.username),
      email: toTrimmedString(payload.email),
      password: toTrimmedString(payload.password),
      rol: toTrimmedString(payload.rol, 'mesero') || 'mesero',
      activo: toBoolean(payload.activo, true)
    };
  }

  static normalizeLoginPayload(body = {}) {
    const payload = pickFields(body, ['username', 'password']);

    return {
      username: toTrimmedString(payload.username),
      password: toTrimmedString(payload.password)
    };
  }

  // ============================
  //        REGISTRO
  // ============================
  static async register(req, res) {
    try {
      const { idusuario, nombre, username, email, password, rol, activo } = AuthController.normalizeRegisterPayload(req.body);

      if (!idusuario || !nombre || !username || !email || !password) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
      }

      // Crear usuario usando la clase
      const nuevoUsuario = new Usuario(idusuario, nombre, username, email, password, rol, activo);
      const user = await nuevoUsuario.registrar();

      res.status(201).json({
        mensaje: "Usuario registrado correctamente",
        usuario: {
          idusuario: user.idusuario,
          nombre: user.nombre,
          username: user.username,
          email: user.email,
          rol: user.rol,
          activo: user.activo
        }
      });

    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }



  // ============================
  //            LOGIN
  // ============================
  static async login(req, res) {
    try {
      const { username, password } = AuthController.normalizeLoginPayload(req.body);

      if (!username || !password) {
        return res.status(400).json({ mensaje: "Username y contraseña son requeridos" });
      }

      const user = await Usuario.obtenerPorUsuario(username);

      if (!user)
        return res.status(404).json({ mensaje: "Usuario no encontrado" });

      // 🚫 Usuario desactivado
      if (!user.activo) {
        return res.status(403).json({
          mensaje: "Usuario desactivado. Contacte al administrador."
        });
      }

      const valido = await Usuario.validarPassword(password, user.password);

      if (!valido)
        return res.status(401).json({ mensaje: "Contraseña incorrecta" });

      const rolDoc = await RolModel.findOne({ nombre: user.rol });
      const permisos = Array.isArray(rolDoc?.permisos) ? rolDoc.permisos : [];

      // Crear token
      const token = jwt.sign(
        {
          username: user.username,
          rol: user.rol,
          permisos
        },
        SECRET_KEY,
        { expiresIn: "8h" }
      );

      res.status(200).json({
        mensaje: "Inicio de sesión exitoso",
        usuario: {
          _id: user._id,
          idusuario: user.idusuario,
          nombre: user.nombre,
          username: user.username,
          rol: user.rol,
          permisos
        },
        token
      });

    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ error: error.message });
    }
  }



  // ============================
  //            LOGOUT
  // ============================
  static async logout(req, res) {
    try {
      res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default AuthController;
