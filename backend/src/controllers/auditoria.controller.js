import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AUDIT_TYPES, mapAudit, parseAuditPagination, recordAuditLog } from '../lib/audit.js';
import { asString, asNumber } from '../lib/prismaUtils.js';

const isAdminRole = (role) => ['administrador', 'admin', 'root'].includes(String(role || '').toLowerCase());

const parseBooleanFilter = (value) => {
  if (typeof value === 'undefined') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const buildConditions = (req, query = {}, { ownOnly = false } = {}) => {
  const conditions = [Prisma.sql`"empresaId" = ${req.user.empresaId}`];

  if (ownOnly || !isAdminRole(req.user?.rol)) {
    conditions.push(Prisma.sql`"usuarioId" = ${req.user.id}`);
  } else if (query.usuarioId) {
    conditions.push(Prisma.sql`"usuarioId" = ${asString(query.usuarioId)}`);
  }

  if (query.tipo) conditions.push(Prisma.sql`"tipo" = ${asString(query.tipo)}`);
  if (query.accion) conditions.push(Prisma.sql`"accion" = ${asString(query.accion)}`);
  if (query.modulo) conditions.push(Prisma.sql`"modulo" = ${asString(query.modulo)}`);

  const exito = parseBooleanFilter(query.exito);
  if (typeof exito === 'boolean') conditions.push(Prisma.sql`"exito" = ${exito}`);

  const statusCode = asNumber(query.statusCode, NaN);
  if (Number.isFinite(statusCode)) conditions.push(Prisma.sql`"statusCode" = ${statusCode}`);

  if (query.from) conditions.push(Prisma.sql`"createdAt" >= ${new Date(query.from)}`);
  if (query.to) conditions.push(Prisma.sql`"createdAt" <= ${new Date(query.to)}`);

  return conditions;
};

const whereClause = (conditions) => Prisma.join(conditions, Prisma.sql` AND `);

export async function registrarEvento(req, res) {
  try {
    const tipo = asString(req.body?.tipo, AUDIT_TYPES.USABILIDAD) || AUDIT_TYPES.USABILIDAD;
    const accion = asString(req.body?.accion, 'evento') || 'evento';
    const modulo = asString(req.body?.modulo, 'frontend') || 'frontend';
    const detalle = asString(req.body?.detalle, '');
    const exito = typeof req.body?.exito === 'boolean' ? req.body.exito : true;
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : null;

    const log = await recordAuditLog({
      empresaId: req.user.empresaId,
      usuarioId: req.user.id,
      tipo,
      accion,
      modulo,
      detalle,
      exito,
      nivel: asString(req.body?.nivel, exito ? 'info' : 'warn') || 'info',
      metodo: 'POST',
      ruta: '/api/auditoria/eventos',
      statusCode: 201,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata
    });

    return res.status(201).json({ mensaje: 'Evento registrado', log: mapAudit(log) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function logAcceso(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId requerido' });
    }

    const log = await recordAuditLog({
      empresaId,
      usuarioId: req.user?.id || null,
      tipo: AUDIT_TYPES.ACCESO,
      accion: asString(req.body?.accion, 'acceso') || 'acceso',
      modulo: asString(req.body?.modulo, 'auth') || 'auth',
      detalle: asString(req.body?.detalle, ''),
      exito: typeof req.body?.exito === 'boolean' ? req.body.exito : true,
      nivel: asString(req.body?.nivel, 'info') || 'info',
      metodo: req.method,
      ruta: req.originalUrl || req.url || '/api/auditoria/acceso',
      statusCode: 201,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : null
    });

    res.status(201).json({ mensaje: 'Acceso registrado', log: mapAudit(log) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listarLogs(req, res) {
  try {
    const { page, limit, skip } = parseAuditPagination(req.query);
    const conditions = buildConditions(req, req.query);
    const clause = whereClause(conditions);

    const [logs, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT a.*, u.username AS "usuarioUsername", u.nombre AS "usuarioNombre"
        FROM "Auditoria" a
        LEFT JOIN "Usuario" u ON u.id = a."usuarioId"
        WHERE ${clause}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM "Auditoria" a
        WHERE ${clause}
      `
    ]);

    const total = totalResult?.[0]?.total || 0;

    res.json({
      data: (logs || []).map(mapAudit),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function historialOperaciones(req, res) {
  try {
    const ownOnly = String(req.query.alcance || 'own').toLowerCase() !== 'all';
    const { page, limit, skip } = parseAuditPagination(req.query);
    const conditions = buildConditions(req, req.query, { ownOnly });
    const clause = whereClause(conditions);

    const [logs, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT a.*, u.username AS "usuarioUsername", u.nombre AS "usuarioNombre"
        FROM "Auditoria" a
        LEFT JOIN "Usuario" u ON u.id = a."usuarioId"
        WHERE ${clause}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM "Auditoria" a
        WHERE ${clause}
      `
    ]);

    const total = totalResult?.[0]?.total || 0;

    res.json({
      data: (logs || []).map(mapAudit),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function sesiones(req, res) {
  try {
    const conditions = buildConditions(req, {
      ...req.query,
      tipo: AUDIT_TYPES.SESION
    });
    const clause = whereClause(conditions);

    const logs = await prisma.$queryRaw`
      SELECT a.*, u.username AS "usuarioUsername", u.nombre AS "usuarioNombre"
      FROM "Auditoria" a
      LEFT JOIN "Usuario" u ON u.id = a."usuarioId"
      WHERE ${clause}
      ORDER BY a."createdAt" DESC
      LIMIT 200
    `;

    res.json((logs || []).map(mapAudit));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function reporteUsabilidad(req, res) {
  try {
    const conditions = buildConditions(req, req.query);
    const clause = whereClause(conditions);

    const [totales, porTipo, porModulo, porAccion, porDia] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE "exito" = true)::int AS exitosos,
          COUNT(*) FILTER (WHERE "exito" = false)::int AS errores,
          COUNT(*) FILTER (WHERE "tipo" = ${AUDIT_TYPES.SESION})::int AS sesiones
        FROM "Auditoria" a
        WHERE ${clause}
      `,
      prisma.$queryRaw`
        SELECT "tipo", COUNT(*)::int AS total
        FROM "Auditoria" a
        WHERE ${clause}
        GROUP BY "tipo"
        ORDER BY total DESC
      `,
      prisma.$queryRaw`
        SELECT "modulo", COUNT(*)::int AS total
        FROM "Auditoria" a
        WHERE ${clause}
        GROUP BY "modulo"
        ORDER BY total DESC
      `,
      prisma.$queryRaw`
        SELECT "accion", COUNT(*)::int AS total
        FROM "Auditoria" a
        WHERE ${clause}
        GROUP BY "accion"
        ORDER BY total DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT date_trunc('day', "createdAt") AS fecha, COUNT(*)::int AS total
        FROM "Auditoria" a
        WHERE ${clause}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    ]);

    const resumen = totales?.[0] || { total: 0, exitosos: 0, errores: 0, sesiones: 0 };
    const total = Number(resumen.total || 0);

    res.json({
      resumen: {
        totalEventos: total,
        exitosos: Number(resumen.exitosos || 0),
        errores: Number(resumen.errores || 0),
        tasaError: total ? Number(resumen.errores || 0) / total : 0,
        sesiones: Number(resumen.sesiones || 0)
      },
      porTipo: porTipo || [],
      porModulo: porModulo || [],
      porAccion: porAccion || [],
      porDia: (porDia || []).map((item) => ({
        fecha: item.fecha,
        total: Number(item.total || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
