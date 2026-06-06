import express from "express";
import materiaPrimaController from "../controllers/materiaPrima.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, requirePermission('gestionar_materias_primas'),materiaPrimaController.crearMateriaPrima);
router.get("/", verifyToken, requirePermission('ver_materias_primas'), materiaPrimaController.listarMateriasPrimas);
router.put("/:idMateriaPrima", verifyToken, requirePermission('gestionar_materias_primas'), materiaPrimaController.actualizarMateriaPrima);
router.delete("/:idMateriaPrima", verifyToken, requirePermission('gestionar_materias_primas'), materiaPrimaController.eliminarMateriaPrima);
router.patch("/:idMateriaPrima/disponible", verifyToken, requirePermission('gestionar_materias_primas'), materiaPrimaController.cambiarDisponibilidad);

export default router;
