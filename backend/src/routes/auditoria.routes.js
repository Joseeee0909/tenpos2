import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import { auditTrail } from '../middlewares/audit.middleware.js';
import {
  historialOperaciones,
  listarLogs,
  logAcceso,
  registrarEvento,
  reporteUsabilidad,
  sesiones
} from '../controllers/auditoria.controller.js';

const router = Router();

router.use(verifyToken);
router.use(auditTrail);

router.post('/auditoria/eventos', registrarEvento);
router.post('/auditoria/acceso', logAcceso);
router.get('/auditoria/historial', historialOperaciones);
router.get('/auditoria/sesiones', requireRole('administrador', 'admin', 'root'), sesiones);
router.get('/auditoria/logs', requireRole('administrador', 'admin', 'root'), listarLogs);
router.get('/auditoria/reportes/usabilidad', requireRole('administrador', 'admin', 'root'), reporteUsabilidad);

export default router;
