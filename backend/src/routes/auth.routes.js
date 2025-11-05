import { Router } from 'express';
const router = Router();
import AuthController from "../controllers/auth.controller.js";
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

// Registrar usuarios: solo administradores pueden crear usuarios nuevos
router.post("/register", verifyToken, requireRole('administrador','admin','root'), AuthController.register)
router.post("/login", AuthController.login)
router.post("/logout", AuthController.logout)


    
export default router;