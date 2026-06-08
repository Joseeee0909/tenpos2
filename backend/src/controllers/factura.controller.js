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

  await Promise.all(
    pedidoItems
      .filter((item) => item.productoId)
      .map((item) =>
        tx.product.update({
          where: { id: item.productoId, empresaId },
          data: { stock: { decrement: Math.abs(Number(item.cantidad || 1)) } }
        })
      )
  );
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

export const generateUBLXML = (factura) => null;
export const signXML = (xml) => null;
export const sendToDIAN = async (factura) => null;
export const checkDIANStatus = async (factura) => null;

// 🔥 TRANSACCIÓN ATÓMICA BLINDADA Y REPARADA
export const checkoutPedido = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const pedidoId = asString(req.body?.pedidoId);
    const cliente = req.body?.cliente && typeof req.body.cliente === 'object' ? req.body.cliente : null;
    const metodoPago = asString(req.body?.metodoPago, 'Efectivo') || 'Efectivo';
    const incluirPropina = toBoolean(req.body?.incluirPropina, false);
    const propinaPercent = toNumber(req.body?.propinaPercent, 10);

    if (!pedidoId) return res.status(400).json({ error: 'pedidoId requerido' });

    const [pedido, configDoc] = await Promise.all([
      prisma.pedido.findFirst({
        where: { id: pedidoId, empresaId },
        include: {
          mesa: true,
          mesero: true,
          productos: { include: { producto: true } }
        }
      }),
      getOrCreateConfig(empresaId)
    ]);

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    const prefijo = normalizeInvoicePrefix(configDoc.prefijo || 'POS');
    const numero = await generateConsecutiveNumber(empresaId, prefijo);
    const emisor = buildEmisorFromConfig(configDoc);
    const clienteData = buildClientePayload(cliente);
    const facturaItems = pedido.productos.map((item) => buildFacturaItemData(item));
    const propinaBase = incluirPropina ? Number((facturaItems.reduce((sum, line) => sum + line.subtotal, 0) * (propinaPercent / 100)).toFixed(2)) : 0;
    const totals = computeInvoiceTotals(facturaItems, propinaBase);
    const total = totals.total;
    const metodoPagoLabel = formatPaymentMethod(metodoPago);

    // Todo se ejecuta dentro del bloque seguro de base de datos
    const factura = await prisma.$transaction(async (tx) => {
      if (String(pedido.estado || '').toLowerCase() !== 'entregado') {
        await validateAndDiscountStock(tx, empresaId, pedido.productos);
      }

      // 1. Cambiamos el estado del pedido a 'entregado' de forma síncrona
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { estado: 'entregado' }
      });

      // 2. Si el pedido tiene una mesa asociada, cambiamos su estado a 'disponible' de forma síncrona
      if (pedido.mesaId) {
        await tx.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: 'disponible' }
        });
      }

      // 3. Creamos la factura comercial
      return await tx.factura.create({
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
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio: item.precio,
              ivaPorcentaje: item.ivaPorcentaje,
              subtotal: item.subtotal,
              total: item.total
            }))
          }
        }
      });
    });

    // 🚀 RESPUESTA INMEDIATA Y SEGURA: Los datos en DB ya cambiaron al 100%
    return res.json({
      factura: mapFactura(factura),
      pdfUrl: `/api/facturas/${numero}/pdf`,
      pdfBase64: null 
    });

  } catch (error) {
    console.error("Error en checkoutPedido:", error);
    if (error.status === 409) {
      return res.status(409).json({ error: error.message, items: error.items });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const previewFactura = async (req, res) => {
  try {
    const { pedidoId } = req.query || {};
    if (!pedidoId) return res.status(400).json({ error: 'pedidoId requerido' });

    const pedido = await prisma.pedido.findFirst({
      where: { id: String(pedidoId), empresaId: req.user.empresaId },
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
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const listFacturas = async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      where: { empresaId: req.user.empresaId },
      include: facturaInclude,
      orderBy: { fecha: 'desc' },
      take: 50 
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
      },
      include: {
        pedido: { 
          include: { 
            mesero: true,
            productos: { include: { producto: true } }
          } 
        },
        items: true
      }
    });

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const dir = path.join(process.cwd(), 'storage', 'facturas');
    ensureDir(dir);
    const cleanInvoiceNumber = String(factura.numero).replace(/[^a-zA-Z0-9-]/g, '_');
    const filePath = path.join(dir, `ticket-${cleanInvoiceNumber}.pdf`);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(fs.readFileSync(filePath));
    }

    const configDoc = await getOrCreateConfig(req.user.empresaId);
    const prefijo = factura.prefijo;
    const numero = factura.numero;
    const emisor = factura.emisor;
    const clienteData = factura.cliente;
    
    const facturaItems = factura.items.map(item => ({
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      ivaPorcentaje: item.ivaPorcentaje,
      subtotal: item.subtotal,
      total: item.total
    }));

    const totals = {
      subtotal: factura.subtotal,
      ivaTotal: factura.ivaTotal,
      descuento: 0,
      total: factura.total
    };

    const seqMatch = numero.match(/-(\d+)$/);
    const seqNum = seqMatch ? seqMatch[1] : '01';

    const invoicePayload = {
      title: 'FACTURA',
      prefijo,
      numero,
      emisor,
      cliente: clienteData,
      items: facturaItems,
      totals,
      propina: factura.propina,
      descuento: 0,
      metodoPago: factura.metodoPago,
      montoRecibido: factura.total, 
      cambio: 0,
      mesa: factura.mesa,
      caja: `caja ${factura.mesa ?? 1}`,
      cajaRef: `${String(factura.mesa ?? '1').padStart(6, '0')} - ${String(seqNum).slice(-2).padStart(2, '0')}`,
      vendedor: factura.pedido?.mesero?.nombre || factura.pedido?.mesero?.username || emisor.razonSocial,
      estado: formatInvoiceState('GENERADA'),
      cufe: generateCUFE({ prefijo, numero, total: factura.total, fecha: factura.fecha.toISOString() }),
      dianStatus: null,
      fecha: factura.fecha.toISOString(),
      taxSettings: getTaxSettingsSummary(configDoc)
    };

    const pdfBuffer = await buildInvoicePdfBuffer(invoicePayload, { pageSize: '80mm' });
    
    fs.promises.writeFile(filePath, pdfBuffer)
      .then(() => {
        prisma.factura.update({
          where: { id: factura.id },
          data: { pdfPath: filePath }
        }).catch(err => console.error("Error actualizando ruta PDF:", err));
      })
      .catch(err => console.error("Error guardando archivo PDF de fondo:", err));

    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdfBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};