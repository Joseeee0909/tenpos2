  import prisma from './prisma.js';
  import { randomUUID } from 'crypto';
  import { asNumber, asString, withId } from './prismaUtils.js';

  const SAFE_QUERY_KEYS = ['from', 'to', 'tipo', 'accion', 'modulo', 'usuarioId', 'exito', 'page', 'limit', 'statusCode', 'alcance'];

  export const AUDIT_TYPES = {
    USABILIDAD: 'usabilidad',
    OPERACION: 'operacion',
    ACCESO: 'acceso',
    SESION: 'sesion',
    ERROR: 'error'
  };

  export const buildSafeMetadata = (req = {}) => {
    const query = {};
    for (const key of SAFE_QUERY_KEYS) {
      if (typeof req.query?.[key] !== 'undefined') query[key] = req.query[key];
    }

    return {
      query,
      params: req.params || {},
      path: req.originalUrl || req.url || '',
      method: req.method || ''
    };
  };

  export const classifyRoute = (req = {}, res = {}) => {
    const path = String(req.originalUrl || req.url || '').toLowerCase();
    const method = String(req.method || '').toUpperCase();

    if (path.includes('/login')) return { tipo: AUDIT_TYPES.ACCESO, accion: 'login' };
    if (path.includes('/logout')) return { tipo: AUDIT_TYPES.SESION, accion: 'logout' };
    if (res.statusCode >= 400) return { tipo: AUDIT_TYPES.ERROR, accion: `${method.toLowerCase()}_error` };
    if (path.includes('/facturas') || path.includes('/ventas') || path.includes('/pedidos')) {
      return { tipo: AUDIT_TYPES.OPERACION, accion: `${method.toLowerCase()}_${req.route?.path || 'request'}` };
    }
    return { tipo: AUDIT_TYPES.USABILIDAD, accion: `${method.toLowerCase()}_${req.route?.path || 'request'}` };
  };

  export async function recordAuditLog(data = {}) {
    const empresaId = asString(data.empresaId);
    if (!empresaId) return null;

    const metadataValue =
      typeof data.metadata === 'undefined' || data.metadata === null
        ? null
        : JSON.stringify(data.metadata);

    const rows = await prisma.$queryRaw`
      INSERT INTO "Auditoria" (
        "id",
        "empresaId",
        "usuarioId",
        "tipo",
        "accion",
        "modulo",
        "detalle",
        "exito",
        "nivel",
        "metodo",
        "ruta",
        "statusCode",
        "duracionMs",
        "ip",
        "userAgent",
        "metadata",
        "createdAt"
      ) VALUES (
        ${randomUUID()},
        ${empresaId},
        ${data.usuarioId ?? null},
        ${asString(data.tipo, AUDIT_TYPES.USABILIDAD)},
        ${asString(data.accion, 'unknown')},
        ${asString(data.modulo, 'general')},
        ${asString(data.detalle, '')},
        ${typeof data.exito === 'boolean' ? data.exito : true},
        ${asString(data.nivel, data.exito === false ? 'warn' : 'info')},
        ${data.metodo ? asString(data.metodo) : null},
        ${data.ruta ? asString(data.ruta) : null},
        ${Number.isFinite(Number(data.statusCode)) ? Number(data.statusCode) : null},
        ${Number.isFinite(Number(data.duracionMs)) ? Number(data.duracionMs) : null},
        ${data.ip ? asString(data.ip) : null},
        ${data.userAgent ? asString(data.userAgent) : null},
        ${metadataValue}::jsonb,
        NOW()
      )
      RETURNING *
    `;

    return rows?.[0] || null;
  }

  export const mapAudit = (log) => withId({
    ...log,
    statusCode: log?.statusCode ?? null,
    duracionMs: log?.duracionMs ?? null
  });

  export const parseAuditPagination = (query = {}) => {
    const page = Math.max(1, asNumber(query.page, 1));
    const limit = Math.min(100, Math.max(1, asNumber(query.limit, 25)));
    return { page, limit, skip: (page - 1) * limit };
  };
