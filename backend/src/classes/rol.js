import prisma from "../lib/prisma.js";

class Rol {
  constructor(
    empresaId,
    nombre,
    descripcion,
    color = "#7c3aed",
    permisos = [],
    activo = true
  ) {
    this.empresaId = empresaId;
    this.idrol = `rol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.color = color;
    this.permisos = permisos;
    this.activo = activo;
  }

  async guardar() {
    return await prisma.rol.create({
      data: {
        empresaId: this.empresaId,
        idrol: this.idrol,
        nombre: this.nombre,
        descripcion: this.descripcion,
        color: this.color,
        permisos: this.permisos,
        activo: this.activo
      }
    });
  }

  static async obtenerTodos(empresaId) {
    return await prisma.rol.findMany({
      where: { empresaId }
    });
  }

  static async obtenerPorNombre(nombre, empresaId) {
    return await prisma.rol.findFirst({
      where: {
        nombre,
        empresaId
      }
    });
  }

  static async obtenerPorId(id, empresaId) {
    return await prisma.rol.findFirst({
      where: {
        id,
        empresaId
      }
    });
  }

  static async eliminar(id, empresaId) {
    return await prisma.rol.delete({
      where: { id, empresaId }
    });
  }

  static async actualizar(id, empresaId, datos) {
    return await prisma.rol.update({
      where: { id, empresaId },
      data: datos
    });
  }

  static async desactivar(id, empresaId) {
    return await prisma.rol.update({
      where: { id, empresaId },
      data: { activo: false }
    });
  }

  static async activar(id, empresaId) {
    return await prisma.rol.update({
      where: { id, empresaId },
      data: { activo: true }
    });
  }
}

export default Rol;
