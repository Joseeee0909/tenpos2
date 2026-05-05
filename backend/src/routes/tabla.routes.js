import { Router } from 'express';
import TablaController from '../controllers/tabla.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Inicializar mesas (crear 10 por defecto) - DEBE ESTAR ANTES de GET /:id
router.post('/init/default', verifyToken, requireRole('administrador', 'admin', 'root'), TablaController.inicializarMesas);

// Obtener todas las mesas
router.get('/', TablaController.obtenerTablas);

// Crear nueva mesa (admin only)
router.post('/', verifyToken, requireRole('administrador', 'admin', 'root'), TablaController.crearTabla);

// Obtener una mesa
router.get('/:id', TablaController.obtenerTabla);

// Actualizar mesa
router.put('/:id', verifyToken, TablaController.actualizarTabla);

// Eliminar mesa (admin only)
router.delete('/:id', verifyToken, requireRole('administrador', 'admin', 'root'), TablaController.eliminarTabla);

export default router;
