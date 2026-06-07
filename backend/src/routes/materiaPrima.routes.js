import express from "express";
import materiaPrimaController from "../controllers/materiaPrima.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, requirePermission('gestionar_inventario'),materiaPrimaController.crearMateriaPrima);
router.get("/", verifyToken, requirePermission('ver_inventario'), materiaPrimaController.listarMateriasPrimas);
router.put("/:idMateriaPrima", verifyToken, requirePermission('gestionar_inventario'), materiaPrimaController.actualizarMateriaPrima);
router.delete("/:idMateriaPrima", verifyToken, requirePermission('gestionar_inventario'), materiaPrimaController.eliminarMateriaPrima);
router.patch("/:idMateriaPrima/disponible", verifyToken, requirePermission('gestionar_inventario'), materiaPrimaController.cambiarDisponibilidad);

export default router;
