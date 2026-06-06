import express from "express";
import {
  crearMateriaPrima,
  listarMateriasPrimas,
  actualizarMateriaPrima,
  eliminarMateriaPrima,
  cambiarDisponibilidad
} from "../controllers/materiaPrima.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, requirePermission('gestionar_materias_primas'), crearMateriaPrima);
router.get("/", verifyToken, requirePermission('ver_materias_primas'), listarMateriasPrimas);
router.put("/:idMateriaPrima", verifyToken, requirePermission('gestionar_materias_primas'), actualizarMateriaPrima);
router.delete("/:idMateriaPrima", verifyToken, requirePermission('gestionar_materias_primas'), eliminarMateriaPrima);
router.patch("/:idMateriaPrima/disponible", verifyToken, requirePermission('gestionar_materias_primas'), cambiarDisponibilidad);

export default router;
