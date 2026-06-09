import prisma from "../lib/prisma.js";

class MateriaPrima {
  constructor(
    empresaId,
    idMateriaPrima,
    nombre,
    categoria,
    stock = 0,
    disponible = true,
    unidad = "unidad",
  ) {
    this.empresaId = empresaId;
    this.idMateriaPrima = idMateriaPrima;
    this.nombre = nombre;
    this.categoria = categoria;
    this.stock = stock;
    this.disponible = disponible;
    this.unidad = unidad;
  }

  async guardar() {
    return await prisma.materiaPrima.create({
      data: {
        empresaId: this.empresaId,
        idMateriaPrima: this.idMateriaPrima,
        nombre: this.nombre,
        categoria: this.categoria,
        stock: this.stock,
        disponible: this.disponible,
        unidad: this.unidad,
      },
    });
  }

  static async obtenerTodos(empresaId) {
    return await prisma.materiaPrima.findMany({
      where: { empresaId },
    });
  }

  static async obtenerPorId(idMateriaPrima, empresaId) {
    return await prisma.materiaPrima.findFirst({
      where: {
      empresaId_idMateriaPrima: {
        empresaId,
        idMateriaPrima
      }
    },
    });
  }

  static async eliminarPorId(idMateriaPrima, empresaId) {
    return await prisma.materiaPrima.update({
      where: {
      empresaId_idMateriaPrima: {
        empresaId,
        idMateriaPrima
      }
    },
      data: {
        disponible: false,
      },
    });
  }

  static async actualizarPorId(idMateriaPrima, empresaId, datosActualizados) {
  return await prisma.materiaPrima.update({
    where: {
      empresaId_idMateriaPrima: {
        empresaId,
        idMateriaPrima
      }
    },
    data: datosActualizados,
  });
  }
}

export default MateriaPrima;
