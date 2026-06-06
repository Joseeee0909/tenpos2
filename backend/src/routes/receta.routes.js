import express from "express";
import {
  obtenerReceta,
  crearReceta,
  eliminarReceta,
  actualizarReceta
} from "../controllers/receta.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.get("/:productoId", verifyToken, requirePermission('ver_recetas', 'gestionar_recetas'), obtenerReceta);
router.post("/", verifyToken, requirePermission('gestionar_recetas'), crearReceta);
router.delete("/:productoId/:materiaPrimaId", verifyToken, requirePermission('gestionar_recetas'), eliminarReceta);
router.put("/:productoId/:materiaPrimaId", verifyToken, requirePermission('gestionar_recetas'), actualizarReceta);
export default router;