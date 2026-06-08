import { Router } from 'express';
import IaAnalyticsController from '../controllers/iaAnalytics.controller.js';
// Cambia esto por la ruta real de tu middleware de autenticación (JWT)
import { verifyToken } from '../middlewares/auth.middleware.js'; 

const router = Router();

// Endpoint del panel analítico de IA
router.get('/ia/inventario-analisis', verifyToken, IaAnalyticsController.getInventarioAnalisis);

export default router;