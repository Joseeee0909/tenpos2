import UsuarioModel from "../models/user.model.js";
import bcrypt from "bcrypt";
import rolModel from "../models/rol.model.js";

class Usuario {
  constructor(idusuario,nombre, username, email, password, rol = "mesero") {
    this.idusuario = idusuario;
    this.nombre = nombre;
    this.username = username;
    this.email = email;
    this.password = password;
    this.rol = rol;
  }

  async registrar() {
    // Verificar que el rol exista en la base de datos
    const rolExistente = await rolModel.findOne({ nombre: this.rol });
    if (!rolExistente) {
      throw new Error(`Rol "${this.rol}" no existe. Crea el rol antes de asignarlo.`);
    }

    const hashedPassword = await bcrypt.hash(this.password, 10);

    const nuevoUsuario = new UsuarioModel({
      idusuario: this.idusuario,
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
  static async eliminar(id) {
  return await UsuarioModel.findByIdAndDelete(id);
}

static async desactivar(id) {
  return await UsuarioModel.findByIdAndUpdate(id, { activo: false }, { new: true });
}

static async activar(id) {
  return await UsuarioModel.findByIdAndUpdate(id, { activo: true }, { new: true });
}
static async actualizar(id, datosActualizados) {
  if (datosActualizados.password) {
    datosActualizados.password = await bcrypt.hash(datosActualizados.password, 10);
  }
  return await UsuarioModel.findByIdAndUpdate(id, datosActualizados, { new: true });
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
