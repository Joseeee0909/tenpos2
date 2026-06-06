import prisma from "../lib/prisma.js";

    class Receta {
    constructor(
        empresaId, 
        productoId, 
        materiaPrimaId, 
        cantidad
        ) {
        this.empresaId = empresaId;
        this.productoId = productoId;
        this.materiaPrimaId = materiaPrimaId;
        this.cantidad = cantidad;
    }

    async guardar() {
        return await prisma.receta.create({
        data: {
            empresaId: this.empresaId,
            productoId: this.productoId,
            materiaPrimaId: this.materiaPrimaId,
            cantidad: this.cantidad,
        },
        });
    }

    static async obtenerPorProducto(empresaId, productoId) {
        return await prisma.receta.findMany({
        where: {
            empresaId,
            productoId,
        },
        include: {
            materiaPrima: true,
        },
        });
    }
    static async eliminarReceta(empresaId, productoId, materiaPrimaId) {
        return await prisma.receta.delete({
        where: {
            empresaId,
            productoId,
            materiaPrimaId,
        },
        });
    }
    static async actualizarReceta(
        empresaId,
        productoId,
        materiaPrimaId,
        nuevaCantidad,
    ) {
        return await prisma.receta.update({
        where: {
            empresaId,
            productoId,
            materiaPrimaId,
        },
        data: {
            cantidad: nuevaCantidad,
        },
        });
    }
    static async eliminarRecetasPorProducto(empresaId, productoId) {
        return await prisma.receta.deleteMany({
        where: {
            empresaId,
            productoId,
        },
        });
    }
    }
    export default Receta;
