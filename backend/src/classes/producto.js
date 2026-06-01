import prisma from "../lib/prisma.js";

class Producto {
  constructor(
    empresaId,
    idproducto,
    nombre,
    precio,
    descripcion,
    categoria,
    stock = 0,
    disponible = true
  ) {
    this.empresaId = empresaId;
    this.idproducto = idproducto;
    this.nombre = nombre;
    this.precio = precio;
    this.descripcion = descripcion;
    this.categoria = categoria;
    this.stock = stock;
    this.disponible = disponible;
  }

  static async obtenerTodos(empresaId) {
    return await prisma.product.findMany({
      where: { empresaId }
    });
  }

  static async obtenerPorId(id, empresaId) {
    return await prisma.product.findFirst({
      where: {
        id,
        empresaId
      }
    });
  }

  static async eliminarPorId(id, empresaId) {
    return await prisma.product.update({
      where: { id, empresaId },
      data: {
        disponible: false
      }
    });
  }

  static async actualizarPorId(id, empresaId, datosActualizados) {
    return await prisma.product.update({
      where: { id, empresaId },
      data: datosActualizados
    });
  }

  async guardar() {
    return await prisma.product.create({
      data: {
        empresaId: this.empresaId,
        idproducto: this.idproducto,
        nombre: this.nombre,
        precio: this.precio,
        descripcion: this.descripcion,
        categoria: this.categoria,
        stock: this.stock,
        disponible: this.disponible
      }
    });
  }
}

export default Producto;
