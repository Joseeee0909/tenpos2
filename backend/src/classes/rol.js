import RolModel from "../models/rol.model.js";

class Rol {
  constructor(nombre, descripcion, color = '#7c3aed', permisos = [], activo = true) {
    this.idrol = `rol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.color = color;
    this.permisos = permisos;
    this.activo = activo;
  }

  async guardar() {
    const rol = new RolModel({
      idrol: this.idrol,
      nombre: this.nombre,
      descripcion: this.descripcion,
      color: this.color,
      permisos: this.permisos,
      activo: this.activo
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

  static async actualizar(id, datos) {
    return await RolModel.findByIdAndUpdate(id, datos, { new: true });
  }

  static async desactivar(id) {
    return await RolModel.findByIdAndUpdate(id, { activo: false }, { new: true });
  }

  static async activar(id) {
    return await RolModel.findByIdAndUpdate(id, { activo: true }, { new: true });
  }
}

export default Rol;
