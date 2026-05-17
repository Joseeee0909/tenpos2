import express from "express";
import {
  crearVenta,
  obtenerVentas,
  obtenerVenta,
  actualizarVenta,
  eliminarVenta,
  limpiarVentas
} from "../controllers/venta.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, requirePermission('gestionar_ventas'), crearVenta);
router.get("/", verifyToken, requirePermission('ver_ventas', 'gestionar_ventas'), obtenerVentas);
router.delete("/", verifyToken, requirePermission('gestionar_ventas'), limpiarVentas);
router.get(":id", verifyToken, requirePermission('ver_ventas', 'gestionar_ventas'), obtenerVenta);
router.put(":id", verifyToken, requirePermission('gestionar_ventas'), actualizarVenta);
router.delete(":id", verifyToken, requirePermission('gestionar_ventas'), eliminarVenta);

export default router;
