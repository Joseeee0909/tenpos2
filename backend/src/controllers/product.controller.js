import Producto from "../classes/producto.js";
import { pickFields, toBoolean, toNumber, toTrimmedString } from "../utils/requestPayload.js";

const PRODUCT_FIELDS = ['idproducto', 'nombre', 'precio', 'descripcion', 'categoria', 'stock', 'disponible'];

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
            const payload = pickFields(req.body, PRODUCT_FIELDS);
            const idproducto = toTrimmedString(payload.idproducto);
            const nombre = toTrimmedString(payload.nombre);
            const precio = toNumber(payload.precio, NaN);
            const descripcion = toTrimmedString(payload.descripcion);
            const categoria = toTrimmedString(payload.categoria);
            const stock = toNumber(payload.stock, 0);
            const disponible = toBoolean(payload.disponible, true);

            if (!idproducto ||!nombre || !precio || !categoria) {
                return res.status(400).json({ mensaje: 'Faltan datos requeridos: idproducto, nombre, precio, categoria' });
            }
            if (!Number.isFinite(precio)) {
                return res.status(400).json({ mensaje: 'precio debe ser un número válido' });
            }

            const nuevoProducto = new Producto(idproducto, nombre, precio, descripcion || '', categoria, stock, disponible);
            const savedProduct = await nuevoProducto.guardar();
            res.status(201).json({ mensaje: 'Producto creado', producto: savedProduct });
        } catch (err) {
            console.error('Error creando producto:', err);
            res.status(500).json({ error: err.message });
        }
    }
    static async cambiarDisponibilidad(req, res) {
    try {
        const { id } = req.params;
        const disponible = toBoolean(req.body?.disponible, false);

        const productoInstance = new Producto();
        const actualizado = await productoInstance.actualizarPorId(id, { disponible });

        if (!actualizado) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        res.status(200).json({ mensaje: 'Disponibilidad actualizada', producto: actualizado });

    } catch (err) {
        console.error('Error cambiando disponibilidad:', err);
        res.status(500).json({ error: err.message });
    }
}
    static async eliminarProducto(req, res) {
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
    static async actualizarProducto(req, res) {
        try {
            const { id } = req.params;
            const datosActualizados = pickFields(req.body, PRODUCT_FIELDS);
            if ('nombre' in datosActualizados) datosActualizados.nombre = toTrimmedString(datosActualizados.nombre);
            if ('precio' in datosActualizados) datosActualizados.precio = toNumber(datosActualizados.precio, NaN);
            if ('descripcion' in datosActualizados) datosActualizados.descripcion = toTrimmedString(datosActualizados.descripcion);
            if ('categoria' in datosActualizados) datosActualizados.categoria = toTrimmedString(datosActualizados.categoria);
            if ('stock' in datosActualizados) datosActualizados.stock = toNumber(datosActualizados.stock, 0);
            if ('disponible' in datosActualizados) datosActualizados.disponible = toBoolean(datosActualizados.disponible, true);

            if ('precio' in datosActualizados && !Number.isFinite(datosActualizados.precio)) {
                return res.status(400).json({ mensaje: 'precio debe ser un número válido' });
            }

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
    static async obtenerProductoPorId(req, res) {
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