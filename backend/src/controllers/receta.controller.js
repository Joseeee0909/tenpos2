import Receta from "../classes/receta.js";
import { pickFields, toNumber } from "../utils/requestPayload.js";

const RECETA_FIELDS = ['productoId', 'materiaPrimaId', 'cantidad'];

class RecetaController {
    static async obtenerReceta(req, res) {
        try {
            const { productoId } = req.params;
            const receta = await Receta.obtenerPorProducto(req.user.empresaId, productoId);
            res.status(200).json({ receta });
        }
        catch (err) {
            console.error('Error obteniendo receta:', err);
            res.status(500).json({ error: err.message });
        }
    }
    static async crearReceta(req, res) {
        try {
            const payload = pickFields(req.body, RECETA_FIELDS);
            const productoId = payload.productoId;
            const materiaPrimaId = payload.materiaPrimaId;
            const cantidad = toNumber(payload.cantidad, NaN);

            if (!productoId || !materiaPrimaId || !Number.isFinite(cantidad)) {
                return res.status(400).json({ mensaje: 'Faltan datos requeridos o cantidad no es un número válido: productoId, materiaPrimaId, cantidad' });
            }
            const receta = new Receta(req.user.empresaId, productoId, materiaPrimaId, cantidad);
            const savedReceta = await receta.guardar();
            res.status(201).json({ mensaje: 'Receta creada', receta: savedReceta });
        }
        catch (err) {
            console.error('Error creando receta:', err);
            res.status(500).json({ error: err.message });
        }
    }
    static async eliminarReceta(req, res) {
        try {
            const { productoId, materiaPrimaId } = req.params;
            const deletedReceta = await Receta.eliminarReceta(req.user.empresaId, productoId, materiaPrimaId);
            res.status(200).json({ mensaje: 'Receta eliminada', receta: deletedReceta });
        }
        catch (err) {
            console.error('Error eliminando receta:', err);
            res.status(500).json({ error: err.message });
        }
    }
    static async actualizarReceta(req, res) {
        try {
            const { productoId, materiaPrimaId } = req.params;
            const nuevaCantidad = toNumber(req.body?.cantidad, NaN);
            if (!Number.isFinite(nuevaCantidad)) {
                return res.status(400).json({ mensaje: 'Cantidad no es un número válido' });
            }
            const updatedReceta = await Receta.actualizarReceta(req.user.empresaId, productoId, materiaPrimaId, nuevaCantidad);
            res.status(200).json({ mensaje: 'Receta actualizada', receta: updatedReceta });
        }
        catch (err) {
            console.error('Error actualizando receta:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

export default RecetaController;