import IaAnalyticsService from '../services/iaAnalytics.service.js';

class IaAnalyticsController {
  async getInventarioAnalisis(req, res) {
    try {
      // Obtenemos la empresa del token decodificado (inyectado por tu middleware de auth)
      const { empresaId } = req.user; 

      if (!empresaId) {
        return res.status(400).json({
          success: false,
          message: 'La identificación de la empresa es requerida.',
        });
      }

      const analisis = await IaAnalyticsService.generarAnalisisPredictivo(empresaId);
      
      return res.status(200).json({
        success: true,
        data: analisis,
      });
    } catch (error) {
      console.error('Error en IaAnalyticsController:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar las predicciones de IA.',
        error: error.message,
      });
    }
  }
}

export default new IaAnalyticsController();