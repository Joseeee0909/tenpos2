import { Router } from 'express';
const router = Router();
import RolController from '../controllers/rol.controller.js';
import { verifyToken, requirePermission } from '../middlewares/auth.middleware.js';

// List roles (public)
// List roles
router.get('/', verifyToken, RolController.listarRoles);

// Create role (admin only)
// Create role
router.post('/', verifyToken, requirePermission('gestionar_roles'), RolController.crearRol);
router.put('/:id', verifyToken, requirePermission('gestionar_roles'), RolController.actualizarRol);
router.put('/desactivar/:id', verifyToken, requirePermission('gestionar_roles'), RolController.desactivarRol);
router.put('/activar/:id', verifyToken, requirePermission('gestionar_roles'), RolController.activarRol);

export default router;
