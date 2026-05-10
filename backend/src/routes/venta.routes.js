import express from "express";
import {
  crearVenta,
  obtenerVentas,
  obtenerVenta,
  actualizarVenta,
  eliminarVenta,
  limpiarVentas
} from "../controllers/venta.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", crearVenta);
router.get("/", obtenerVentas);
router.delete("/", verifyToken, requireRole('administrador', 'admin', 'root'), limpiarVentas);
router.get("/:id", obtenerVenta);
router.put("/:id", actualizarVenta);
router.delete("/:id", eliminarVenta);

export default router;
