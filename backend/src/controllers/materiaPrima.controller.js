import MateriaPrima from "../classes/materiaPrima.js";
import {
  pickFields,
  toBoolean,
  toNumber,
  toTrimmedString,
} from "../utils/requestPayload.js";

const MATERIA_PRIMA_FIELDS = [
  "idMateriaPrima",
  "nombre",
  "categoria",
  "stock",
  "disponible",
  "unidad",
];

class MateriaPrimaController {
  static async listarMateriasPrimas(req, res) {
    try {
      const MateriasPrimas = await MateriaPrima.obtenerTodos(
        req.user.empresaId,
      );
      res.status(200).json({ MateriasPrimas });
    } catch (err) {
      console.error("Error listando materias primas:", err);
      res.status(500).json({ error: err.message });
    }
  }
  static async crearMateriaPrima(req, res) {
    try {
      const payload = pickFields(req.body, MATERIA_PRIMA_FIELDS);
      const idMateriaPrima = toTrimmedString(payload.idMateriaPrima);
      const nombre = toTrimmedString(payload.nombre);
      const categoria = toTrimmedString(payload.categoria);
      const stock = toNumber(payload.stock, 0);
      if (stock < 0) {
        return res.status(400).json({
          mensaje: "El stock no puede ser negativo",
        });
      }
      
      const disponible = toBoolean(payload.disponible, true);
      const unidad = toTrimmedString(payload.unidad) || "unidad";

      if (!idMateriaPrima || !nombre || !categoria) {
        return res
          .status(400)
          .json({
            mensaje:
              "Faltan datos requeridos: idMateriaPrima, nombre, categoria",
          });
      }
      const materiaPrima = new MateriaPrima(
        req.user.empresaId,
        idMateriaPrima,
        nombre,
        categoria,
        stock,
        disponible,
        unidad,
      );
      const savedMateriaPrima = await materiaPrima.guardar();
      res
        .status(201)
        .json({
          mensaje: "Materia prima creada",
          materiaPrima: savedMateriaPrima,
        });
    } catch (err) {
      console.error("Error creando materia prima:", err);
      res.status(500).json({ error: err.message });
    }
  }
  static async cambiarDisponibilidad(req, res) {
    try {
      const { idMateriaPrima } = req.params;
      const disponible = toBoolean(req.body?.disponible, false);
      const updatedMateriaPrima = await materiaPrima.actualizarPorId(
        idMateriaPrima,
        req.user.empresaId,
        { disponible },
      );
      res
        .status(200)
        .json({
          mensaje: "Disponibilidad actualizada",
          materiaPrima: updatedMateriaPrima,
        });
    } catch (err) {
      console.error("Error cambiando disponibilidad:", err);
      res.status(500).json({ error: err.message });
    }
  }
  static async eliminarMateriaPrima(req, res) {
    try {
      const { idMateriaPrima } = req.params;
      const updatedMateriaPrima = await materiaPrima.eliminarPorId(
        idMateriaPrima,
        req.user.empresaId,
      );
      res
        .status(200)
        .json({
          mensaje: "Materia prima eliminada",
          materiaPrima: updatedMateriaPrima,
        });
    } catch (err) {
      console.error("Error eliminando materia prima:", err);
      res.status(500).json({ error: err.message });
    }
  }
  static async actualizarMateriaPrima(req, res) {
    try {
      const { idMateriaPrima } = req.params;
      const payload = pickFields(req.body, MATERIA_PRIMA_FIELDS);
      const nombre = toTrimmedString(payload.nombre);
      const categoria = toTrimmedString(payload.categoria);
      const stock = toNumber(payload.stock);
      const disponible = toBoolean(payload.disponible);
      const unidad = toTrimmedString(payload.unidad);
      const updatedMateriaPrima = await materiaPrima.actualizarPorId(
        idMateriaPrima,
        req.user.empresaId,
        { nombre, categoria, stock, disponible, unidad },
      );
      res
        .status(200)
        .json({
          mensaje: "Materia prima actualizada",
          materiaPrima: updatedMateriaPrima,
        });
    } catch (err) {
      console.error("Error actualizando materia prima:", err);
      res.status(500).json({ error: err.message });
    }
  }
}

export default MateriaPrimaController;
