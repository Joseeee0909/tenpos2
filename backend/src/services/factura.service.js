import prisma from '../lib/prisma.js';
import { asNumber, asString } from '../lib/prismaUtils.js';

const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  credit_card: 'Tarjeta Crédito',
  debit_card: 'Tarjeta Débito',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata'
};

const KNOWN_FACTURA_STATES = ['BORRADOR', 'GENERADA', 'PENDIENTE_DIAN', 'VALIDADA', 'RECHAZADA', 'ANULADA'];

const parseNitValue = (nit = '') => {
  const value = String(nit || '').trim();
  if (!value) return { nit: '', dv: '' };
  const [rawNit, rawDv] = value.split('-').map((part) => String(part || '').trim());
  return {
    nit: rawNit || value,
    dv: rawDv || ''
  };
};

export const normalizeInvoicePrefix = (prefijo) => {
  const raw = String(prefijo || 'POS').trim().toUpperCase();
  const match = raw.match(/^[A-Z]+/);
  return match ? match[0] : 'POS';
};

export const formatConsecutiveNumber = (prefijo, sequence) => {
  const prefix = normalizeInvoicePrefix(prefijo);
  return `${prefix}-${String(sequence).padStart(6, '0')}`;
};

export const generateConsecutiveNumber = async (empresaId, prefijo = 'POS') => {
  const prefix = normalizeInvoicePrefix(prefijo);
  const existing = await prisma.factura.findFirst({
    where: {
      empresaId,
      prefijo: prefix,
      numero: { startsWith: `${prefix}-` }
    },
    orderBy: { numero: 'desc' },
    select: { numero: true }
  });

  if (!existing?.numero) {
    return formatConsecutiveNumber(prefix, 1);
  }

  const match = existing.numero.match(/-(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return formatConsecutiveNumber(prefix, next);
};

export const formatPaymentMethod = (method) => {
  if (!method) return PAYMENT_METHOD_LABELS.cash;
  const normalized = String(method).trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[normalized] || String(method).trim();
};

export const formatInvoiceState = (state) => {
  const value = String(state || 'GENERADA').trim().toUpperCase();
  return KNOWN_FACTURA_STATES.includes(value) ? value : value;
};

export const buildEmisorFromConfig = (config = {}) => {
  const { nit, dv } = parseNitValue(config?.nit || '800200100-0');
  return {
    razonSocial: config?.nombre || 'SIIGO S.A.S',
    nit: nit || '800200100',
    dv: dv || '0',
    direccion: config?.direccion || 'Cali, Colombia',
    telefono: config?.telefono || '3001234567',
    email: config?.email || 'empresa@email.com',
    resolucion: asString(config?.resolucion, ''),
    rangoAutorizado: asString(config?.autorizada, '')
  };
};

export const buildClientePayload = (clienteInput) => {
  const cliente = clienteInput && typeof clienteInput === 'object' ? clienteInput : {};
  const nombre = asString(cliente.nombre || cliente.nombreCompleto || cliente.razonSocial || '');
  const numeroDocumento = asString(cliente.numeroDocumento || cliente.numero || cliente.documento || '');
  const tipoDocumento = asString(cliente.tipoDocumento || cliente.tipo || 'CC').toUpperCase();
  const email = asString(cliente.email || cliente.correo || '');
  const telefono = asString(cliente.telefono || cliente.celular || '');
  const direccion = asString(cliente.direccion || cliente.direccionFisica || '');

  if (!nombre && !numeroDocumento) {
    return {
      tipoDocumento: 'CC',
      numeroDocumento: '222222222222',
      nombre: 'Consumidor Final',
      email: '',
      telefono: '',
      direccion: ''
    };
  }

  return {
    tipoDocumento,
    numeroDocumento: numeroDocumento || '222222222222',
    nombre: nombre || 'Consumidor Final',
    email,
    telefono,
    direccion
  };
};

export const buildFacturaItemData = (item) => {
  const cantidad = Math.max(1, asNumber(item?.cantidad, 1));
  const precio = asNumber(item?.precio, 0);
  const ivaPorcentaje = asNumber(item?.ivaPorcentaje ?? item?.iva ?? 19, 19);
  const subtotal = Number((cantidad * precio).toFixed(2));
  const ivaLinea = Number((subtotal * (ivaPorcentaje / 100)).toFixed(2));
  const total = Number((subtotal + ivaLinea).toFixed(2));

  return {
    productoId: asString(item?.productoId) || null,
    codigo: asString(item?.codigo) || asString(item?.producto?.codigo) || asString(item?.producto?.idproducto) || null,
    nombre: asString(item?.nombre) || asString(item?.producto?.nombre) || 'Producto',
    cantidad,
    precio,
    ivaPorcentaje,
    subtotal,
    ivaLinea,
    total
  };
};

export const computeInvoiceTotals = (items, propina = 0, descuento = 0) => {
  const subtotal = Number(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0).toFixed(2));
  const ivaTotal = Number(items.reduce((sum, item) => sum + Number(item.ivaLinea || 0), 0).toFixed(2));
  const total = Number((subtotal + ivaTotal + Number(propina || 0) - Number(descuento || 0)).toFixed(2));
  return { subtotal, ivaTotal, descuento: Number(descuento || 0), propina: Number(propina || 0), total };
};

export const formatTaxSetting = (value) => {
  const normalized = String(value || '').trim();
  return normalized === '' ? 'No configurado' : normalized;
};

export const getTaxSettingsSummary = (config = {}) => ({
  resolucion: formatTaxSetting(config?.resolucion),
  rangoAutorizado: formatTaxSetting(config?.autorizada),
  prefijoAutorizado: formatTaxSetting(config?.prefijo)
});
