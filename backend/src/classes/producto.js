import productModel from "../models/product.model.js";
class Producto {
    constructor(nombre, precio, descripcion, categoria, stock = true) {
        this.nombre = nombre;
        this.precio = precio;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.stock = stock;
    }
    async obtenerTodos() {
        return await productModel.find();
    }
    async obtenerPorId(id) {
        return await productModel.findById(id);
    }
    async eliminarPorId(id) {
        return await productModel.findByIdAndDelete(id);
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
            stock: this.stock
        });
        return await nuevoProducto.save();
    };
    

}

export default Producto;