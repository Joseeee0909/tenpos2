import UsuarioModel from "../models/user.model.js";
import bcrypt from "bcrypt";
import rolModel from "../models/rol.model.js";

class Usuario {
  constructor(nombre, username, email, password, rol = "mesero") {
    this.nombre = nombre;
    this.username = username;
    this.email = email;
    this.password = password;
    this.rol = rol;
  }

  async registrar() {
    const hashedPassword = await bcrypt.hash(this.password, 10);

    const nuevoUsuario = new UsuarioModel({
      nombre: this.nombre,
      username: this.username,
      email: this.email,
      password: hashedPassword,
      rol: this.rol,
    });

    await nuevoUsuario.save();
    return nuevoUsuario;
  }

  static async obtenerPorUsuario(username) {
    return await UsuarioModel.findOne({ username });
  }


  static async obtenerTodos() {
    return await UsuarioModel.find();
  }


  static async validarPassword(passwordPlano, passwordHash) {
    return await bcrypt.compare(passwordPlano, passwordHash);
  }

  toJSON() {
    return {
      username: this.username,
      email: this.email,
      rol: this.rol,
    };
  }
}

export default Usuario;
