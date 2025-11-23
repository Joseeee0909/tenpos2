import express from "express";
import usuarioController from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", usuarioController.listarUsuarios);
router.put("/:id", usuarioController.actualizar);
router.put("/desactivar/:id", usuarioController.desactivarUsuario);
router.put("/activar/:id", usuarioController.activarUsuario);

export default router;
