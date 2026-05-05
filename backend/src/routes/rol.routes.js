import { Router } from 'express';
const router = Router();
import RolController from '../controllers/rol.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

// List roles (public)
router.get('/', RolController.listarRoles);

// Create role (admin only)
router.post('/', verifyToken, requireRole('administrador','admin','root'), RolController.crearRol);
router.put('/:id', verifyToken, requireRole('administrador','admin','root'), RolController.actualizarRol);
router.put('/desactivar/:id', verifyToken, requireRole('administrador','admin','root'), RolController.desactivarRol);
router.put('/activar/:id', verifyToken, requireRole('administrador','admin','root'), RolController.activarRol);

export default router;
