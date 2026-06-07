import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { once } from 'events';
import QRCode from 'qrcode';

const DEFAULT_PAGE_SIZE = 'A4';
const DEFAULT_MARGIN = 36;
const TICKET_WIDTH = 226;
const TICKET_HEIGHT = 2400;

const LEGAL_DISCLAIMER =
  '(*) Esta factura se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobraran intereses por mora. Garantia';

const POS_LEGAL_TEXT =
  'Documento equivalente electrónico tiquete de máquina registradora con sistema P.O.S. RA 186 .';

const SOFTWARE_FOOTER = {
  nombre: 'TENPOS',
  nit: '901587423-1',
  dv: '0'
};

export const generateInvoiceQR = (factura) => {
  const prefix = String(factura.prefijo || 'POS').trim().toUpperCase();
  const number = String(factura.numero || '').trim();
  return `QR_PENDIENTE_${prefix}_${number}`;
};

export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  const formatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `$${formatter.format(amount)}`;
};

export const formatTicketAmount = (value) => {
  const amount = Math.round(Number(value || 0));
  return amount.toLocaleString('es-CO');
};

export const formatDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${day}/${month}/${year} ${hour12}:${minutes} ${ampm}`;
};

const formatTicketDate = (value) => {
  const date = value ? new Date(value) : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTicketTime = (value) => {
  const date = value ? new Date(value) : new Date();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes}:${seconds} ${ampm}`;
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  credit_card: 'Tarjeta Crédito',
  debit_card: 'Tarjeta Débito',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  qr: 'QR'
};

export const translatePaymentMethod = (method) => {
  if (!method) return PAYMENT_METHOD_LABELS.cash;
  const value = String(method).trim();
  const normalized = value.toLowerCase();
  return PAYMENT_METHOD_LABELS[normalized] || value;
};

const getPaymentTicketLabel = (method) => {
  const normalized = String(method || '').trim().toLowerCase();
  if (['cash', 'efectivo', 'contado'].includes(normalized)) return 'CONTADO';
  return String(translatePaymentMethod(method)).toUpperCase();
};

const getTarifaLabel = (ivaPorcentaje) => {
  const iva = Number(ivaPorcentaje || 0);
  if (iva <= 0) return 'C EXCLUI..';
  return `A ${iva}%`;
};

const drawDottedRule = (doc, left, width) => {
  const y = doc.y;
  doc
    .moveTo(left, y)
    .lineTo(left + width, y)
    .dash(1.5, { space: 2 })
    .lineWidth(0.5)
    .strokeColor('#000000')
    .stroke()
    .undash();
  doc.moveDown(0.2);
};

const drawDashedRule = (doc, left, width) => {
  const y = doc.y;
  const pattern = '-'.repeat(Math.max(16, Math.floor(width / 3.5)));
  doc.font('Helvetica').fontSize(7).text(pattern, left, y, { width, align: 'center' });
  doc.moveDown(0.08);
};

const drawDashedBox = (doc, left, top, width, height) => {
  doc
    .rect(left, top, width, height)
    .dash(3, { space: 2 })
    .lineWidth(0.6)
    .strokeColor('#000000')
    .stroke()
    .undash();
};

const drawTotalRow = (doc, left, width, label, value, opts = {}) => {
  const y = doc.y;
  const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
  const size = opts.large ? 9 : 8;
  doc.font(font).fontSize(size);
  doc.text(`${label}:`, left, y, { width: width * 0.58, align: 'left', lineBreak: false });
  doc.text(formatTicketAmount(value), left, y, { width, align: 'right', lineBreak: false });
  if (opts.underline) {
    const lineY = y + size + 2;
    doc
      .moveTo(left + width * 0.45, lineY)
      .lineTo(left + width, lineY)
      .lineWidth(0.5)
      .stroke();
  }
  doc.moveDown(opts.large ? 0.18 : 0.14);
};

const buildQrImageBuffer = async (payload) => {
  const dataUrl = await QRCode.toDataURL(String(payload || 'TENPOS'), {
    margin: 1,
    width: 160,
    errorCorrectionLevel: 'M'
  });
  return Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
};

const buildPosTicketPdf = async (invoice, doc, stream, chunks) => {
  const left = doc.page.margins.left;
  const printableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const center = { width: printableWidth, align: 'center' };
  const textLeft = { width: printableWidth, align: 'left' };

  const company = invoice.emisor || {};
  const client = invoice.cliente || {};
  const taxSettings = invoice.taxSettings || {};
  const razonSocial = company.razonSocial || company.nombre || 'EMPRESA';
  const nit = String(company.nit || '').trim();
  const dv = String(company.dv ?? '0').trim();
  const direccion = String(company.direccion || '').trim();
  const telefono = String(company.telefono || '').trim();

  // --- Encabezado (sin imagen) ---
  doc.font('Helvetica-Bold').fontSize(11).text(razonSocial, center);
  doc.font('Helvetica').fontSize(8).text(razonSocial, center);
  if (nit) doc.font('Helvetica').fontSize(8).text(`${nit}: ${dv}`, center);
  if (direccion) doc.text(`DIR ${direccion}`, center);
  if (telefono) doc.text(`${telefono}: ${nit || '0'} - ${dv}`, center);

  doc.moveDown(0.25);
  doc.font('Helvetica').fontSize(7).text(POS_LEGAL_TEXT, center);

  // --- Caja DIAN ---
  const authTop = doc.y + 4;
  const resolucion = taxSettings.resolucion || 'No configurado';
  const rango = taxSettings.rangoAutorizado || 'No configurado';
  const authText = [
    'Autorización de numeración DIAN',
    resolucion,
    rango
  ].join('\n');
  const authHeight = doc.heightOfString(authText, { width: printableWidth - 12 }) + 14;
  drawDashedBox(doc, left, authTop, printableWidth, authHeight);
  doc.font('Helvetica').fontSize(7).text(authText, left + 6, authTop + 6, {
    width: printableWidth - 12,
    align: 'center'
  });
  doc.y = authTop + authHeight + 8;

  // --- Metadatos transacción ---
  const caja = invoice.caja || `caja ${invoice.mesa ?? 1}`;
  const cajaRef = invoice.cajaRef || invoice.numero || '000000';
  const vendedor = invoice.vendedor || razonSocial;
  const fecha = formatTicketDate(invoice.fecha);
  const hora = formatTicketTime(invoice.fecha);
  const clienteNombre = client?.nombre || 'CONSUMIDOR FINAL';
  const clienteDoc = client?.numeroDocumento || '222222222222';

  doc.font('Helvetica').fontSize(8);
  doc.text(`CAJA: ${caja}`, textLeft);
  doc.text(`# CAJA: ${cajaRef}`, textLeft);
  doc.text(`VEND: ${vendedor}`, textLeft);
  doc.text(`FECHA: ${fecha}   HORA: ${hora}`, textLeft);
  doc.text(`CLIENTE: ${clienteNombre}`, textLeft);
  doc.text(`NIT/CC: ${clienteDoc}`, textLeft);
  doc.moveDown(0.15);

  // --- Tabla productos ---
  drawDottedRule(doc, left, printableWidth);
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(7);
  doc.text('#', left, headerY, { width: 10, lineBreak: false });
  doc.text('DESCRIPCIÓN', left + 12, headerY, { width: printableWidth * 0.42, lineBreak: false });
  doc.text('CNT', left + printableWidth * 0.52, headerY, { width: 22, align: 'right', lineBreak: false });
  doc.text('VALOR', left + printableWidth * 0.62, headerY, { width: 36, align: 'right', lineBreak: false });
  doc.text('TOTAL', left + printableWidth * 0.78, headerY, { width: printableWidth * 0.22, align: 'right', lineBreak: false });
  doc.moveDown(0.22);
  drawDottedRule(doc, left, printableWidth);

  const items = invoice.items || [];
  doc.font('Helvetica').fontSize(7);

  items.forEach((item, index) => {
    const codigo = String(item.codigo || item.productoId || '').trim();
    const nombre = String(item.nombre || 'Producto').trim();
    const cantidad = Math.max(1, Number(item.cantidad || 1));
    const precio = Number(item.precio || 0);
    const lineTotal = Number(item.subtotal ?? cantidad * precio);
    const tarifa = getTarifaLabel(item.ivaPorcentaje);

    doc.text(String(index + 1), textLeft);
    if (codigo) doc.text(codigo, textLeft);
    doc.text(nombre, textLeft);
    doc.text(
      `${cantidad}  ${formatTicketAmount(precio)}  ${formatTicketAmount(lineTotal)} ${tarifa.charAt(0)}`,
      { width: printableWidth, align: 'right' }
    );
    doc.moveDown(0.12);
  });

  drawDottedRule(doc, left, printableWidth);

  const subtotal = items.reduce((sum, item) => {
    const cantidad = Math.max(1, Number(item.cantidad || 1));
    const precio = Number(item.precio || 0);
    return sum + Number(item.subtotal ?? cantidad * precio);
  }, 0);
  const impuesto = Number(invoice.totals?.ivaTotal ?? 0);
  const total = Number(invoice.totals?.total ?? subtotal + impuesto);
  const montoPago = Number(invoice.montoRecibido != null ? invoice.montoRecibido : total);
  const cambio = Math.max(0, Number(invoice.cambio ?? 0));
  const pagoLabel = getPaymentTicketLabel(invoice.metodoPago);
  const totalItems = items.length;

  drawTotalRow(doc, left, printableWidth, 'TOTAL ITEMS', totalItems);
  drawTotalRow(doc, left, printableWidth, 'SUBTOTAL', subtotal);
  drawTotalRow(doc, left, printableWidth, 'IMPUESTO', impuesto);
  drawTotalRow(doc, left, printableWidth, 'TOTAL', total, { bold: true, large: true, underline: true });
  drawTotalRow(doc, left, printableWidth, pagoLabel, montoPago);
  drawTotalRow(doc, left, printableWidth, 'CAMBIO', cambio);

  doc.moveDown(0.1);
  drawDottedRule(doc, left, printableWidth);

  // --- Desglose impuestos ---
  doc.font('Helvetica-Bold').fontSize(7);
  const taxHeaderY = doc.y;
  doc.text('TARIFA', left, taxHeaderY, { width: 48, lineBreak: false });
  doc.text('BASE', left + 50, taxHeaderY, { width: 48, align: 'right', lineBreak: false });
  doc.text('IMP', left + 100, taxHeaderY, { width: 36, align: 'right', lineBreak: false });
  doc.text('TOTAL', left + printableWidth - 52, taxHeaderY, { width: 52, align: 'right', lineBreak: false });
  doc.moveDown(0.18);

  const tarifaPrincipal = getTarifaLabel(items[0]?.ivaPorcentaje ?? 0);
  doc.font('Helvetica').fontSize(7);
  const taxRowY = doc.y;
  doc.text(tarifaPrincipal, left, taxRowY, { width: 48, lineBreak: false });
  doc.text(formatTicketAmount(subtotal), left + 50, taxRowY, { width: 48, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(impuesto), left + 100, taxRowY, { width: 36, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(total), left + printableWidth - 52, taxRowY, { width: 52, align: 'right', lineBreak: false });
  doc.moveDown(0.16);

  const taxTotalY = doc.y;
  doc.font('Helvetica-Bold').fontSize(7);
  doc.text('TOTAL', left, taxTotalY, { width: 48, lineBreak: false });
  doc.text(formatTicketAmount(subtotal), left + 50, taxTotalY, { width: 48, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(impuesto), left + 100, taxTotalY, { width: 36, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(total), left + printableWidth - 52, taxTotalY, { width: 52, align: 'right', lineBreak: false });
  doc.moveDown(0.2);

  drawDottedRule(doc, left, printableWidth);

  doc.font('Helvetica').fontSize(7).text('Impuesto nacional al consumo INC', center);
  doc.text('Gran contribuyente', center);
  doc.moveDown(0.2);

  // --- QR + CUFE ---
  const qrPayload = invoice.cufe || generateInvoiceQR(invoice);
  try {
    const qrBuffer = await buildQrImageBuffer(qrPayload);
    const qrSize = 88;
    const qrX = left + (printableWidth - qrSize) / 2;
    doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
    doc.y += qrSize + 4;
  } catch {
    doc.font('Helvetica').fontSize(7).text('[QR]', center);
  }

  doc.font('Helvetica').fontSize(7).text('cude', center);
  doc.moveDown(0.15);
  doc.font('Helvetica').fontSize(6).text(LEGAL_DISCLAIMER, {
    width: printableWidth,
    align: 'justify'
  });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(7).text(`Elaborado en software ${SOFTWARE_FOOTER.nombre}`, center);
  doc.text(`Nit : ${SOFTWARE_FOOTER.nit} ${SOFTWARE_FOOTER.dv}`, center);

  doc.moveDown(0.15);
  drawDashedRule(doc, left, printableWidth);
  drawDashedRule(doc, left, printableWidth);

  doc.end();
  await once(stream, 'end');
  return Buffer.concat(chunks);
};

export const buildInvoicePdfBuffer = async (invoice, options = {}) => {
  const pageSize =
    options.pageSize === '80mm' ? [TICKET_WIDTH, TICKET_HEIGHT] : DEFAULT_PAGE_SIZE;
  const isTicket = options.pageSize === '80mm';
  const doc = new PDFDocument({
    size: pageSize,
    margins: isTicket
      ? { top: 10, bottom: 10, left: 10, right: 10 }
      : {
          top: DEFAULT_MARGIN,
          bottom: DEFAULT_MARGIN,
          left: DEFAULT_MARGIN,
          right: DEFAULT_MARGIN
        }
  });
  const stream = new PassThrough();
  const chunks = [];
  doc.pipe(stream);
  stream.on('data', (chunk) => chunks.push(chunk));

  if (isTicket) {
    return buildPosTicketPdf(invoice, doc, stream, chunks);
  }

  const invoiceNumber = String(invoice.numero || 'N/A');
  const title = invoice.title || 'FACTURA';
  const company = invoice.emisor || {};
  const client = invoice.cliente || {};
  const taxSettings = invoice.taxSettings || {};
  const companyName = company.razonSocial || company.nombre || 'TENPOS';
  const formattedDate = formatDateTime(invoice.fecha);
  const paymentMethod = translatePaymentMethod(invoice.metodoPago);

  doc.font('Helvetica-Bold').fontSize(20).text(companyName, { align: 'center' });
  doc.moveDown(0.2);
  const nitValue = String(company.nit || '800200100').trim();
  const dvValue = company.dv ? `-${company.dv}` : '';
  doc.font('Helvetica').fontSize(9).text(`NIT: ${nitValue}${dvValue}`, { align: 'center' });
  doc.text(`Dirección: ${company.direccion || 'Cali, Colombia'}`, { align: 'center' });
  doc.text(`Teléfono: ${company.telefono || '3001234567'}`, { align: 'center' });
  doc.text(`Correo: ${company.email || 'empresa@email.com'}`, { align: 'center' });
  doc.moveDown(0.4);
  doc.lineWidth(1).strokeColor('#444444').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12).text(`${title} ${invoiceNumber}`, { align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Estado: ${invoice.estado || 'GENERADA'}`, { align: 'center' });
  doc.text(`Fecha: ${formattedDate}`, { align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(10).text('CLIENTE');
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text(`Nombre: ${client?.nombre || 'Consumidor Final'}`);
  doc.text(`Documento: ${client?.tipoDocumento || 'CC'} ${client?.numeroDocumento || '222222222222'}`);
  doc.moveDown(0.4);
  doc.lineWidth(1).strokeColor('#444444').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(10).text('PRODUCTOS');
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9);
  (invoice.items || []).forEach((item) => {
    doc.text(`${item.cantidad}x ${item.nombre} — ${formatCurrency(item.total)}`);
  });
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').text(`TOTAL: ${formatCurrency(invoice.totals.total)}`);
  doc.moveDown(0.2);
  doc.font('Helvetica').text(`Forma de pago: ${paymentMethod}`);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9).text(`Resolución DIAN: ${taxSettings.resolucion || 'No configurado'}`);

  doc.end();
  await once(stream, 'end');
  return Buffer.concat(chunks);
};
