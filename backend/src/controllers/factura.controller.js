import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { asString, mapFactura } from '../lib/prismaUtils.js';
import { pickFields, toBoolean, toNumber } from '../utils/requestPayload.js';

const FACTURACION_FIELDS = ['nombre', 'nit', 'direccion', 'telefono', 'resolucion', 'autorizada', 'prefijo', 'responsable'];

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const facturaInclude = {
  pedido: {
    include: {
      mesa: true,
      productos: { include: { producto: true } }
    }
  },
  venta: true,
  mesero: true,
  items: {
    include: { producto: true }
  }
};

const configToFacturacion = (config) => ({
  nombre: config?.nombre || 'SIIGO S.A.S',
  nit: config?.nit || '800200100-0',
  direccion: config?.direccion || 'Cali, Colombia',
  telefono: config?.telefono || '',
  resolucion: config?.resolucion || '',
  autorizada: config?.autorizada || '',
  prefijo: config?.prefijo || 'POS - 1',
  responsable: config?.responsable || 'Responsable de IVA'
});

const getOrCreateConfig = (empresaId) => prisma.configuracion.upsert({
  where: { empresaId },
  update: {},
  create: { empresaId }
});

const readTaxSettings = (payload = {}) => {
  const tax = payload.taxSettings || {};
  const vatPercent = Number(tax.vatPercent ?? 19);
  const applyVat = tax.applyVat !== false;
  const pricesIncludeVat = tax.pricesIncludeVat !== false;
  return { vatPercent, applyVat, pricesIncludeVat };
};

const readTaxSettingsFromQuery = (query = {}) => {
  const vatPercent = Number(query.vatPercent ?? 19);
  const applyVat = String(query.applyVat ?? 'true').toLowerCase() !== 'false';
  const pricesIncludeVat = String(query.pricesIncludeVat ?? 'true').toLowerCase() !== 'false';
  return { vatPercent, applyVat, pricesIncludeVat };
};

const buildTotals = (sum, taxSettings) => {
  const base = Math.round(Number(sum || 0));
  const vatRate = taxSettings.applyVat ? taxSettings.vatPercent / 100 : 0;

  if (!vatRate) {
    return { subtotal: base, ivaTotal: 0, total: base };
  }

  if (taxSettings.pricesIncludeVat) {
    const subtotal = Math.round(base / (1 + vatRate));
    let ivaTotal = Math.round(subtotal * vatRate);
    const correction = base - (subtotal + ivaTotal);
    if (correction !== 0) ivaTotal += correction;
    return { subtotal, ivaTotal, total: base };
  }

  const subtotal = base;
  const ivaTotal = Math.round(subtotal * vatRate);
  return { subtotal, ivaTotal, total: subtotal + ivaTotal };
};

const buildPdfBuffer = (lines, options = {}) => {
  const width = Math.round(Number(options.width ?? 350));
  const lineHeight = Math.round(Number(options.lineHeight ?? 16));
  const marginTop = Math.round(Number(options.marginTop ?? 50));
  const marginBottom = Math.round(Number(options.marginBottom ?? 40));
  const marginLeft = Math.round(Number(options.marginLeft ?? 40));
  const safeLineCount = Math.max(1, lines.length);
  const height = Math.max(200, marginTop + marginBottom + (safeLineCount * lineHeight));
  const startY = Math.max(lineHeight, height - marginTop);

  const content = ['BT', '/F1 11 Tf', `${marginLeft} ${startY} Td`];
  lines.forEach((line, index) => {
    if (index > 0) content.push(`0 -${lineHeight} Td`);
    content.push(`(${esc(line)}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');
  const objs = [];
  objs.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objs.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objs.push(`3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj`);
  objs.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj');
  objs.push(`5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  let pdf = '%PDF-1.4\n';
  const offs = [0];
  objs.forEach((obj) => { offs.push(pdf.length); pdf += `${obj}\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offs.length; index += 1) {
    pdf += `${String(offs[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
};

const facturaLines = ({ title, numero, emisor, cliente, mesa, pedidoId, items, totals, propina, total, metodoPago }) => {
  const lines = [];
  const pushIf = (label, value) => { if (value) lines.push(`${label}${value}`); };

  lines.push(emisor.nombre || title);
  pushIf('', emisor.nit);
  pushIf('', emisor.direccion);
  pushIf('Tel: ', emisor.telefono);
  if (title !== 'PRECUENTA') {
    pushIf('Resolucion DIAN ', emisor.resolucion);
    pushIf('Autorizada el: ', emisor.autorizada);
    pushIf('Prefijo POS Del: ', emisor.prefijo);
    pushIf('', emisor.responsable);
  }
  lines.push('----------------------------');
  lines.push(`${title === 'PRECUENTA' ? 'Precuenta' : 'Factura de venta'}: ${emisor.prefijo || 'POS'} - ${numero}`);
  lines.push(`Fecha: ${new Date().toLocaleString('es-CO')}`);
  if (cliente) {
    lines.push(`Cliente: ${cliente.nombre}`);
    lines.push(`C.C / NIT : ${cliente.documento}`);
  }
  if (mesa) lines.push(`Mesa: ${mesa}`);
  if (pedidoId) lines.push(`Pedido: ${String(pedidoId || '').slice(-6).toUpperCase()}`);
  lines.push('----------------------------');
  lines.push('CT  Descripcion        Valor');
  items.forEach((item) => lines.push(`${item.cantidad}  ${item.nombre.slice(0, 14).padEnd(14, ' ')} ${Math.round(item.precio * item.cantidad)}`));
  lines.push('----------------------------');
  lines.push(`SUBTOTAL: ${totals.subtotal}`);
  lines.push(`IVA: ${totals.ivaTotal}`);
  lines.push(`PROPINA: ${propina}`);
  lines.push(`TOTAL: ${total}`);
  if (metodoPago) lines.push(`Forma de Pago: ${metodoPago}`);

  return lines;
};

const validateAndDiscountStock = async (tx, empresaId, pedidoItems) => {
  const productIds = [...new Set(pedidoItems.map((item) => item.productoId).filter(Boolean))];
  if (!productIds.length) return;

  const products = await tx.product.findMany({
    where: {
      empresaId,
      id: { in: productIds }
    },
    select: { id: true, nombre: true, stock: true }
  });

  const stockById = new Map(products.map((product) => [product.id, product]));
  const insufficient = [];

  pedidoItems.forEach((item) => {
    const product = stockById.get(item.productoId);
    const qty = Math.max(0, Number(item.cantidad || 1));
    if (!product || product.stock < qty) {
      insufficient.push({
        productoId: item.productoId,
        nombre: product?.nombre || item?.nombre || 'Producto',
        stock: product?.stock ?? 0,
        requerido: qty
      });
    }
  });

  if (insufficient.length) {
    const error = new Error('Stock insuficiente para completar el pedido');
    error.status = 409;
    error.items = insufficient;
    throw error;
  }

  for (const item of pedidoItems) {
    if (!item.productoId) continue;
    await tx.product.update({
      where: { id: item.productoId, empresaId },
      data: { stock: { decrement: Math.abs(Number(item.cantidad || 1)) } }
    });
  }
};

export const getConfig = async (req, res) => {
  try {
    const config = await getOrCreateConfig(req.user.empresaId);
    res.json(configToFacturacion(config));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const saveConfig = async (req, res) => {
  try {
    const facturacion = pickFields(req.body, FACTURACION_FIELDS);
    const config = await prisma.configuracion.upsert({
      where: { empresaId: req.user.empresaId },
      update: facturacion,
      create: {
        empresaId: req.user.empresaId,
        ...facturacion
      }
    });

    res.json(configToFacturacion(config));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkoutPedido = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const pedidoId = asString(req.body?.pedidoId);
    const cliente = req.body?.cliente && typeof req.body.cliente === 'object' ? req.body.cliente : null;
    const metodoPago = asString(req.body?.metodoPago, 'Efectivo') || 'Efectivo';
    const incluirPropina = toBoolean(req.body?.incluirPropina, false);
    const propinaPercent = toNumber(req.body?.propinaPercent, 10);

    if (!pedidoId) return res.status(400).json({ error: 'pedidoId requerido' });

    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId },
      include: {
        mesa: true,
        mesero: true,
        productos: { include: { producto: true } }
      }
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    const configDoc = await getOrCreateConfig(empresaId);
    const emisor = configToFacturacion(configDoc);
    const taxSettings = readTaxSettings(req.body || {});
    const baseTotal = Number(pedido.total || 0);
    const totals = buildTotals(baseTotal, taxSettings);
    const tipRate = Number.isFinite(propinaPercent) ? propinaPercent / 100 : 0;
    const rawTip = totals.subtotal * tipRate;
    const propina = incluirPropina ? Math.round(rawTip / 100) * 100 : 0;
    const total = totals.total + propina;
    const numero = String(Date.now());
    const items = pedido.productos.map((item) => ({
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: Number(item.cantidad || 1),
      precio: Number(item.precio || 0)
    }));
    const clienteData = cliente && typeof cliente === 'object'
      ? { nombre: cliente.nombre || 'Consumidor Final', documento: cliente.documento || '000000' }
      : { nombre: 'Consumidor Final', documento: '000000' };

    const factura = await prisma.$transaction(async (tx) => {
      if (String(pedido.estado || '').toLowerCase() !== 'entregado') {
        await validateAndDiscountStock(tx, empresaId, pedido.productos);
      }

      const created = await tx.factura.create({
        data: {
          empresaId,
          numero,
          emisor,
          cliente: clienteData,
          subtotal: totals.subtotal,
          ivaTotal: totals.ivaTotal,
          propina,
          total,
          metodoPago,
          pedidoId: pedido.id,
          meseroId: pedido.meseroId || req.user.id || null,
          mesa: pedido.mesa?.numero ?? null,
          items: {
            create: items.map((item) => ({
              productoId: item.productoId,
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio: item.precio
            }))
          }
        },
        include: facturaInclude
      });

      await tx.pedido.update({
        where: { id: pedido.id },
        data: { estado: 'entregado' }
      });

      await tx.mesa.update({
        where: { id: pedido.mesaId },
        data: { estado: 'disponible' }
      });

      return created;
    });

    const lines = facturaLines({
      title: 'FACTURA',
      numero,
      emisor,
      cliente: clienteData,
      items,
      totals,
      propina,
      total,
      metodoPago
    });

    const dir = path.join(process.cwd(), 'storage', 'facturas');
    ensureDir(dir);
    const filePath = path.join(dir, `${numero}.pdf`);
    fs.writeFileSync(filePath, buildPdfBuffer(lines));

    const updated = await prisma.factura.update({
      where: { id: factura.id },
      data: { pdfPath: filePath },
      include: facturaInclude
    });

    res.json({ factura: mapFactura(updated), pdfUrl: `/api/facturas/${numero}/pdf` });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message, items: error.items });
    }
    res.status(500).json({ error: error.message });
  }
};

export const previewFactura = async (req, res) => {
  try {
    const { pedidoId } = req.query || {};
    if (!pedidoId) return res.status(400).json({ error: 'pedidoId requerido' });

    const pedido = await prisma.pedido.findFirst({
      where: {
        id: String(pedidoId),
        empresaId: req.user.empresaId
      },
      include: {
        mesa: true,
        productos: true
      }
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    const configDoc = await getOrCreateConfig(req.user.empresaId);
    const emisor = configToFacturacion(configDoc);
    const taxSettings = readTaxSettingsFromQuery(req.query);
    const baseTotal = Number(pedido.total || 0);
    const totals = buildTotals(baseTotal, taxSettings);
    const tipRate = toNumber(req.query.propinaPercent, 0) / 100;
    const rawTip = totals.subtotal * tipRate;
    const incluirPropina = toBoolean(req.query.incluirPropina, false);
    const propina = incluirPropina ? Math.round(rawTip / 100) * 100 : 0;
    const total = totals.total + propina;
    const numero = String(Date.now());
    const items = pedido.productos.map((item) => ({
      nombre: item.nombre,
      cantidad: Number(item.cantidad || 1),
      precio: Number(item.precio || 0)
    }));

    const lines = facturaLines({
      title: 'PRECUENTA',
      numero,
      emisor,
      mesa: pedido.mesa?.numero || '-',
      pedidoId: pedido.id,
      items,
      totals,
      propina,
      total
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.send(buildPdfBuffer(lines));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listFacturas = async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      where: { empresaId: req.user.empresaId },
      include: facturaInclude,
      orderBy: { fecha: 'desc' },
      take: 200
    });

    res.json(facturas.map(mapFactura));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFacturaPdf = async (req, res) => {
  try {
    const factura = await prisma.factura.findFirst({
      where: {
        empresaId: req.user.empresaId,
        numero: req.params.numero
      }
    });

    if (!factura?.pdfPath || !fs.existsSync(factura.pdfPath)) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.send(fs.readFileSync(factura.pdfPath));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
