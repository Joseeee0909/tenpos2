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
            const { productoId, ingredientes } = req.body;

            if (!productoId || !ingredientes?.length) {
            return res.status(400).json({
                mensaje: "Producto e ingredientes son obligatorios"
            });
            }

            const recetasGuardadas = [];

            for (const ingrediente of ingredientes) {

            const receta = new Receta(
                req.user.empresaId,
                productoId,
                ingrediente.materiaPrimaId,
                Number(ingrediente.cantidad)
            );

            recetasGuardadas.push(
                await receta.guardar()
            );
            }

            return res.status(201).json({
            mensaje: "Receta creada",
            recetas: recetasGuardadas
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
            error: err.message
            });
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
    static async reemplazarReceta(req, res) {
        try {
            const { productoId } = req.params;
            const { ingredientes } = req.body;

            const recetas = await Receta.reemplazarReceta(
                req.user.empresaId,
                productoId,
                ingredientes
            );

            return res.status(200).json({
                mensaje: "Receta actualizada",
                recetas
            });

        } catch (err) {
            console.error(err);

            return res.status(500).json({
                error: err.message
            });
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