import jwt from "jsonwebtoken";
import Usuario from "../classes/usuario.js";

const SECRET_KEY = "clave_secreta_temporal";

class AuthController {
    static async register(req, res) {
    try {
      const { nombre, username, email, password, rol } = req.body;

const nuevoUsuario = new Usuario(nombre, username, email, password, rol);
      const user = await nuevoUsuario.registrar();

      res.status(201).json({
        mensaje: "Usuario registrado correctamente",
        usuario: {
          nombre: user.nombre,
          username: user.username,
          email: user.email,
          password: user.password,
          rol: user.rol
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  static async login(req, res) {
  try {
    const { username, password } = req.body;
    console.log("Intentando login de:", username);

    const user = await Usuario.obtenerPorUsuario(username);
    console.log("Usuario encontrado:", user);

    if (!user) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    console.log("Password recibido:", password);
    console.log("Password en BD:", user.password);

    const valido = await Usuario.validarPassword(password, user.password);
    console.log("Resultado bcrypt.compare:", valido);

    if (!valido) return res.status(401).json({ mensaje: "Contraseña incorrecta" });

    const token = jwt.sign(
      {
        username: user.username,
        rol: user.rol
      },
      SECRET_KEY,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      mensaje: "Inicio de sesión exitoso",
      usuario: {
        username: user.username,
        rol: user.rol
      },
      token
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: error.message });
  }
}



  static async logout(req, res) {
    try {
      res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default  AuthController;
