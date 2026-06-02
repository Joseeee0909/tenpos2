import { classifyRoute, recordAuditLog } from '../lib/audit.js';

const EXCLUDED_PREFIXES = ['/api/auditoria'];

export function auditTrail(req, res, next) {
  const path = String(req.originalUrl || req.url || '');
  const shouldSkip = EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (shouldSkip) {
    return next();
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    if (!req.user?.empresaId) return;
    const { tipo, accion } = classifyRoute(req, res);
    void recordAuditLog({
      empresaId: req.user.empresaId,
      usuarioId: req.user.id || null,
      tipo,
      accion,
      modulo: req.baseUrl ? req.baseUrl.replace('/api', '').replace(/^\//, '') || 'api' : 'api',
      detalle: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : '',
      exito: res.statusCode < 400,
      nivel: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      metodo: req.method,
      ruta: req.originalUrl || req.url || '',
      statusCode: res.statusCode,
      duracionMs: Date.now() - startedAt,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        query: req.query,
        params: req.params
      }
    }).catch((error) => console.error('Audit trail error:', error));
  });

  next();
}
