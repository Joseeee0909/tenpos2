import express from "express";
import usuarioController from "../controllers/user.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, requirePermission('ver_usuarios', 'gestionar_usuarios'), usuarioController.listarUsuarios);
router.put("/desactivar/:id", verifyToken, requirePermission('gestionar_usuarios'), usuarioController.desactivarUsuario);
router.put("/activar/:id", verifyToken, requirePermission('gestionar_usuarios'), usuarioController.activarUsuario);
router.put("/:id", verifyToken, requirePermission('gestionar_usuarios'), usuarioController.actualizar);

export default router;
