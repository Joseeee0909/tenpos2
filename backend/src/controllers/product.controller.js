import Producto from "../classes/producto.js";

class ProductController {
    static async listarProductos(req, res) {
        try {
            const productoInstance = new Producto();
            const productos = await productoInstance.obtenerTodos();
            res.status(200).json({ productos });
        } catch (err) {
            console.error('Error listando productos:', err);
            res.status(500).json({ error: err.message });
        }
    }
    static async crearProducto(req, res) {
        try {
            const { nombre, precio, descripcion, categoria, stock } = req.body;
            if (!nombre || !precio || !descripcion || !categoria) {
                return res.status(400).json({ mensaje: 'Faltan datos requeridos' });
            }
            const nuevoProducto = new Producto(nombre, precio, descripcion, categoria, stock);
            const savedProduct = await nuevoProducto.guardar();
            res.status(201).json({ mensaje: 'Producto creado', producto: savedProduct });
        } catch (err) {
            console.error('Error creando producto:', err);
            res.status(500).json({ error: err.message });
        }
    }
    async eliminarProducto(req, res) {
        try {
            const { id } = req.params;
            const productoInstance = new Producto();
            const eliminado = await productoInstance.eliminarPorId(id);

            if (!eliminado) {
                return res.status(404).json({ mensaje: 'Producto no encontrado' });
            }

            res.status(200).json({ mensaje: 'Producto eliminado', producto: eliminado });
        }
        catch (err) {
            console.error('Error eliminando producto:', err);
            res.status(500).json({ error: err.message });
        }
    }
    async actualizarProducto(req, res) {
        try {
            const { id } = req.params;
            const datosActualizados = req.body;
            const productoInstance = new Producto();
            const actualizado = await productoInstance.actualizarPorId(id, datosActualizados);  
            if (!actualizado) {
                return res.status(404).json({ mensaje: 'Producto no encontrado' });
            }
            res.status(200).json({ mensaje: 'Producto actualizado', producto: actualizado });
        } catch (err) {
            console.error('Error actualizando producto:', err);
            res.status(500).json({ error: err.message });
        }
    }
    async obtenerProductoPorId(req, res) {
        try {
            const { id } = req.params;
            const productoInstance = new Producto();
            const producto = await productoInstance.obtenerPorId(id);
            if (!producto) {
                return res.status(404).json({ mensaje: 'Producto no encontrado' });
            }
            res.status(200).json({ producto });
        } catch (err) {
            console.error('Error obteniendo producto:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

export default ProductController;