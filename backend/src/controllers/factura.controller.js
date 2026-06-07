import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { asNumber, asString, mapFactura } from '../lib/prismaUtils.js';
import { pickFields, toBoolean, toNumber } from '../utils/requestPayload.js';
import {
  buildClientePayload,
  buildEmisorFromConfig,
  buildFacturaItemData,
  computeInvoiceTotals,
  formatInvoiceState,
  formatPaymentMethod,
  generateConsecutiveNumber,
  getTaxSettingsSummary,
  normalizeInvoicePrefix
} from '../services/factura.service.js';
import { buildInvoicePdfBuffer, generateInvoiceQR } from '../services/pdf.service.js';

const FACTURACION_FIELDS = ['nombre', 'nit', 'direccion', 'telefono', 'email', 'resolucion', 'autorizada', 'prefijo', 'responsable'];
const FACTURA_STATES = ['BORRADOR', 'GENERADA', 'PENDIENTE_DIAN', 'VALIDADA', 'RECHAZADA', 'ANULADA'];

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const facturaInclude = {
  pedido: {
    include: {
      mesa: true,
      productos: { include: { producto: true } }
    }
  },
  venta: {
    include: {
      items: { include: { producto: true } }
    }
  },
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
  email: config?.email || 'empresa@email.com',
  resolucion: config?.resolucion || '',
  autorizada: config?.autorizada || '',
  prefijo: config?.prefijo || 'POS',
  responsable: config?.responsable || 'Responsable de IVA',
  emisor: buildEmisorFromConfig(config)
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

export const generateCUFE = (factura) => {
  const prefijo = asString(factura?.prefijo, 'POS');
  const numero = asString(factura?.numero, '0');
  const total = asNumber(factura?.total, 0);
  const fecha = asString(factura?.fecha, new Date().toISOString());
  return `CUDE-${prefijo}-${numero}-${total}-${fecha.slice(0, 10)}`;
};

export const generateUBLXML = (factura) => {
  // Placeholder: build UBL 2.1 XML structure from factura object.
  // This is intentionally empty until DIAN/Factus integration is implemented.
  return null;
};

export const signXML = (xml) => {
  // Placeholder: sign UBL XML with the company's digital certificate.
  return null;
};

export const sendToDIAN = async (factura) => {
  // Placeholder: send signed UBL XML to DIAN or a third-party provider.
  return null;
};

export const checkDIANStatus = async (factura) => {
  // Placeholder: query DIAN status for a previously submitted factura.
  return null;
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
    const prefijo = normalizeInvoicePrefix(configDoc.prefijo || 'POS');
    const numero = await generateConsecutiveNumber(empresaId, prefijo);
    const emisor = buildEmisorFromConfig(configDoc);
    const clienteData = buildClientePayload(cliente);
    const facturaItems = pedido.productos.map((item) => buildFacturaItemData(item));
    const propinaBase = incluirPropina ? Number((facturaItems.reduce((sum, line) => sum + line.subtotal, 0) * (propinaPercent / 100)).toFixed(2)) : 0;
    const totals = computeInvoiceTotals(facturaItems, propinaBase);
    const total = totals.total;
    const metodoPagoLabel = formatPaymentMethod(metodoPago);
    const montoRecibido = toNumber(req.body?.montoRecibido, total);
    const cambio = Math.max(0, toNumber(req.body?.cambio, 0));

    const factura = await prisma.$transaction(async (tx) => {
      if (String(pedido.estado || '').toLowerCase() !== 'entregado') {
        await validateAndDiscountStock(tx, empresaId, pedido.productos);
      }

      const created = await tx.factura.create({
        data: {
          empresaId,
          prefijo,
          numero,
          emisor,
          cliente: clienteData,
          subtotal: totals.subtotal,
          ivaTotal: totals.ivaTotal,
          propina: propinaBase,
          total,
          metodoPago: metodoPagoLabel,
          estado: 'GENERADA',
          pedidoId: pedido.id,
          meseroId: pedido.meseroId || req.user.id || null,
          mesa: pedido.mesa?.numero ?? null,
          items: {
            create: facturaItems.map((item) => ({
              productoId: item.productoId,
              codigo: item.codigo,
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio: item.precio,
              ivaPorcentaje: item.ivaPorcentaje,
              subtotal: item.subtotal,
              total: item.total
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

    const dir = path.join(process.cwd(), 'storage', 'facturas');
    ensureDir(dir);
    const filePath = path.join(dir, `${numero}.pdf`);
    const seqMatch = numero.match(/-(\d+)$/);
    const seqNum = seqMatch ? seqMatch[1] : '01';

    const pdfBuffer = await buildInvoicePdfBuffer(
      {
        title: 'FACTURA',
        prefijo,
        numero,
        emisor,
        cliente: clienteData,
        items: facturaItems,
        totals,
        propina: propinaBase,
        descuento: totals.descuento,
        metodoPago: metodoPagoLabel,
        montoRecibido,
        cambio,
        mesa: pedido.mesa?.numero ?? null,
        caja: `caja ${pedido.mesa?.numero ?? 1}`,
        cajaRef: `${String(pedido.mesa?.numero ?? '1').padStart(6, '0')} - ${String(seqNum).slice(-2).padStart(2, '0')}`,
        vendedor:
          pedido.mesero?.nombre ||
          pedido.mesero?.username ||
          pedido.responsable ||
          emisor.razonSocial,
        estado: formatInvoiceState('GENERADA'),
        cufe: generateCUFE({ prefijo, numero, total, fecha: new Date().toISOString() }),
        dianStatus: null,
        fecha: new Date().toISOString(),
        taxSettings: getTaxSettingsSummary(configDoc)
      },
      { pageSize: '80mm' }
    );
    fs.writeFileSync(filePath, pdfBuffer);

    const updated = await prisma.factura.update({
      where: { id: factura.id },
      data: { pdfPath: filePath },
      include: facturaInclude
    });

    // Also return base64 for immediate frontend display (avoids extra GET/token issues)
    const pdfBase64 = Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : null;

    res.json({ factura: mapFactura(updated), pdfUrl: `/api/facturas/${numero}/pdf`, pdfBase64 });
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
        productos: { include: { producto: true } }
      }
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    const configDoc = await getOrCreateConfig(req.user.empresaId);
    const prefijo = normalizeInvoicePrefix(configDoc.prefijo || 'POS');
    const emisor = buildEmisorFromConfig(configDoc);
    const numero = await generateConsecutiveNumber(req.user.empresaId, prefijo);
    const facturaItems = pedido.productos.map((item) => buildFacturaItemData(item));
    const incluirPropina = toBoolean(req.query.incluirPropina, false);
    const propinaPercent = toNumber(req.query.propinaPercent, 0);
    const propina = incluirPropina ? Number((facturaItems.reduce((sum, line) => sum + line.subtotal, 0) * (propinaPercent / 100)).toFixed(2)) : 0;
    const totals = computeInvoiceTotals(facturaItems, propina);

    const seqMatch = numero.match(/-(\d+)$/);
    const seqNum = seqMatch ? seqMatch[1] : '01';

    const pdfBuffer = await buildInvoicePdfBuffer(
      {
        title: 'PRECUENTA',
        prefijo,
        numero,
        emisor,
        cliente: buildClientePayload(null),
        mesa: pedido.mesa?.numero ?? null,
        caja: `caja ${pedido.mesa?.numero ?? 1}`,
        cajaRef: `${String(pedido.mesa?.numero ?? '1').padStart(6, '0')} - ${String(seqNum).slice(-2).padStart(2, '0')}`,
        vendedor: emisor.razonSocial,
        pedidoId: pedido.id,
        items: facturaItems,
        totals,
        propina,
        descuento: totals.descuento,
        metodoPago: formatPaymentMethod(req.query.metodoPago || 'Efectivo'),
        montoRecibido: totals.total,
        cambio: 0,
        estado: formatInvoiceState('BORRADOR'),
        cufe: generateCUFE({ prefijo, numero, total: totals.total, fecha: new Date().toISOString() }),
        dianStatus: null,
        fecha: new Date().toISOString(),
        taxSettings: getTaxSettingsSummary(configDoc)
      },
      { pageSize: '80mm' }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
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
