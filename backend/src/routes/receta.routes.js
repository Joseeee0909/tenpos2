import express from "express";
import recetaController from "../controllers/receta.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.get("/:productoId", verifyToken, requirePermission('ver_recetas', 'gestionar_recetas'), recetaController.obtenerReceta);
router.post("/", verifyToken, requirePermission('gestionar_recetas'), recetaController.crearReceta);
router.delete("/:productoId/:materiaPrimaId", verifyToken, requirePermission('gestionar_recetas'), recetaController.eliminarReceta);
router.put("/:productoId/:materiaPrimaId", verifyToken, requirePermission('gestionar_recetas'), recetaController.actualizarReceta);
router.put("/:productoId",  verifyToken,  requirePermission("gestionar_recetas"),  recetaController.reemplazarReceta);
export default router;