import productModel from "../models/product.model.js";

class Producto {
    constructor(nombre, precio, descripcion, categoria, stock = 0, disponible = true) {
        this.nombre = nombre;
        this.precio = precio;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.stock = stock;
        this.disponible = disponible;
    }

    async obtenerTodos() {
        return await productModel.find();
    }

    async obtenerPorId(id) {
        return await productModel.findById(id);
    }

    async eliminarPorId(id) {
        return await productModel.findByIdAndUpdate(
            id,
            { disponible: false },
            { new: true }
        );
    }

    async actualizarPorId(id, datosActualizados) {
        return await productModel.findByIdAndUpdate(id, datosActualizados, { new: true });
    }


    async guardar() {
        const nuevoProducto = new productModel({
            nombre: this.nombre,
            precio: this.precio,
            descripcion: this.descripcion,
            categoria: this.categoria,
            stock: this.stock,
            disponible: this.disponible
        });
        return await nuevoProducto.save();
    }
}

export default Producto;
