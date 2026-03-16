import RolModel from "../models/rol.model.js";

class Rol {
  constructor(nombre, descripcion) {
    this.idrol = `rol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nombre = nombre;
    this.descripcion = descripcion;
  }

  async guardar() {
    const rol = new RolModel({
      idrol: this.idrol,
      nombre: this.nombre,
      descripcion: this.descripcion
    });
    await rol.save();
    return rol;
  }

  static async obtenerTodos() {
    return await RolModel.find();
  }

  static async obtenerPorNombre(nombre) {
    return await RolModel.findOne({ nombre });
  }

  static async eliminar(nombre) {
    return await RolModel.findOneAndDelete({ nombre });
  }
}

export default Rol;
