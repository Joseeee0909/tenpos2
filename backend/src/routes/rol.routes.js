import { Router } from 'express';
const router = Router();
import RolController from '../controllers/rol.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

// List roles (public)
router.get('/', RolController.listarRoles);

// Create role (admin only)
router.post('/', verifyToken, requireRole('administrador','admin','root'), RolController.crearRol);

export default router;
