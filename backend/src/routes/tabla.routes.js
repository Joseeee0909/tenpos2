import { Router } from 'express';
import TablaController from '../controllers/tabla.controller.js';
import { verifyToken, requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

// Inicializar mesas (crear 10 por defecto) - DEBE ESTAR ANTES de GET /:id
router.post('/init/default', verifyToken, requirePermission('gestionar_mesas'), TablaController.inicializarMesas);

// Obtener todas las mesas
router.get('/', verifyToken, requirePermission('ver_mesas', 'gestionar_mesas'), TablaController.obtenerTablas);

// Crear nueva mesa
router.post('/', verifyToken, requirePermission('gestionar_mesas'), TablaController.crearTabla);

// Obtener una mesa
router.get('/:id', verifyToken, requirePermission('ver_mesas', 'gestionar_mesas'), TablaController.obtenerTabla);

// Actualizar mesa
router.put('/:id', verifyToken, requirePermission('gestionar_mesas'), TablaController.actualizarTabla);

// Eliminar mesa
router.delete('/:id', verifyToken, requirePermission('gestionar_mesas'), TablaController.eliminarTabla);

export default router;
