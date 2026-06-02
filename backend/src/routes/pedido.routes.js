import express from "express"
import {
  crearPedido,
  obtenerPedidos,
  obtenerPedido,
  actualizarPedido,
  eliminarPedido
} from "../controllers/pedido.controller.js"
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/", verifyToken, requirePermission('crear_pedidos'), crearPedido)
router.get("/", verifyToken, requirePermission('ver_pedidos', 'crear_pedidos', 'editar_pedidos'), obtenerPedidos)
router.get("/:id", verifyToken, requirePermission('ver_pedidos', 'crear_pedidos', 'editar_pedidos'), obtenerPedido)
router.put("/:id", verifyToken, requirePermission('editar_pedidos'), actualizarPedido)
router.delete("/:id", verifyToken, requirePermission('editar_pedidos'), eliminarPedido)

export default router