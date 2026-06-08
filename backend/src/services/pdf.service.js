import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { once } from 'events';
import QRCode from 'qrcode';

const DEFAULT_PAGE_SIZE = 'A4';
const DEFAULT_MARGIN = 36;
const TICKET_WIDTH = 280; // Ancho POS ideal para que nada se quiebre

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
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
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
    .dash(1, { space: 1.5 })
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
  doc.moveDown(0.2);
};

const drawDashedBox = (doc, left, top, width, height) => {
  doc
    .rect(left, top, width, height)
    .dash(2, { space: 2 })
    .lineWidth(0.5)
    .strokeColor('#000000')
    .stroke()
    .undash();
};

const drawTotalRow = (doc, left, width, label, value, opts = {}) => {
  const y = doc.y;
  const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
  const size = opts.large ? 8.5 : 7.5;
  doc.font(font).fontSize(size);
  
  doc.text(`${label}:`, left, y, { width: width * 0.5, align: 'left', lineBreak: false });
  doc.text(formatTicketAmount(value), left, y, { width: width, align: 'right', lineBreak: false });
  
  if (opts.underline && !opts.isMeasuring) {
    const lineY = y + size + 1;
    doc
      .moveTo(left + width * 0.45, lineY)
      .lineTo(left + width, lineY)
      .lineWidth(0.5)
      .strokeColor('#000000')
      .stroke();
  }
  doc.moveDown(opts.large ? 0.25 : 0.2);
};

const buildQrImageBuffer = async (payload) => {
  const dataUrl = await QRCode.toDataURL(String(payload || 'TENPOS'), {
    margin: 1,
    width: 120,
    errorCorrectionLevel: 'M'
  });
  return Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
};

const renderTicketContent = async (invoice, doc, isMeasuring = false) => {
  const left = doc.page.margins.left;
  const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
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

  // --- Encabezado ---
  doc.font('Helvetica-Bold').fontSize(11).text(razonSocial, center);
  if (nit) doc.font('Helvetica').fontSize(8).text(`${razonSocial}\n${nit}-${dv}`, center);
  if (direccion) doc.fontSize(7.5).text(`DIR: ${direccion}`, center);
  if (telefono) doc.fontSize(7.5).text(`TEL: ${telefono}`, center);

  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(7).text(POS_LEGAL_TEXT, center);

  // --- Caja DIAN ---
  doc.moveDown(0.2);
  const authTop = doc.y;
  const resolucion = taxSettings.resolucion || '18764012345678';
  const rango = taxSettings.rangoAutorizado || '15/01/2025';
  const authText = `Autorización de numeración DIAN\n${resolucion}\n${rango}`;
  
  const authHeight = doc.heightOfString(authText, { width: printableWidth - 8 }) + 8;
  if (!isMeasuring) drawDashedBox(doc, left, authTop, printableWidth, authHeight);
  doc.font('Helvetica').fontSize(7.5).text(authText, left + 4, authTop + 4, {
    width: printableWidth - 8,
    align: 'center'
  });
  doc.y = authTop + authHeight + 6;

  // --- Metadatos transacción ---
  const caja = invoice.caja || 'caja 1';
  const numCaja = invoice.cajaRef || '000001 - 01';
  const vendedor = invoice.vendedor || 'root';
  const fecha = formatTicketDate(invoice.fecha);
  const hora = formatTicketTime(invoice.fecha);
  const clienteNombre = client?.nombre || 'Consumidor Final';
  const clienteDoc = client?.numeroDocumento || '222222222222';

  doc.font('Helvetica').fontSize(7.5);
  doc.text(`CAJA: ${caja.toUpperCase()}`, textLeft);
  doc.text(`# CAJA: ${numCaja}`, textLeft);
  doc.text(`VEND: ${vendedor.toUpperCase()}`, textLeft);
  doc.text(`FECHA: ${fecha}   HORA: ${hora}`, textLeft);
  doc.text(`CLIENTE: ${clienteNombre}`, textLeft);
  doc.text(`NIT/CC: ${clienteDoc}`, textLeft);
  doc.moveDown(0.2);

  // --- Tabla productos ---
  if (!isMeasuring) drawDottedRule(doc, left, printableWidth);
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(7);
  doc.text('#', left, headerY, { width: 12, lineBreak: false });
  doc.text('DESCRIPCIÓN', left + 15, headerY, { width: printableWidth * 0.50, lineBreak: false });
  doc.text('CNT', left + printableWidth * 0.65, headerY, { width: 18, align: 'right', lineBreak: false });
  doc.text('VALOR', left + printableWidth * 0.74, headerY, { width: 32, align: 'right', lineBreak: false });
  doc.text('TOTAL', left + printableWidth * 0.90, headerY, { width: printableWidth * 0.10, align: 'right', lineBreak: false });
  doc.moveDown(0.3);
  if (!isMeasuring) drawDottedRule(doc, left, printableWidth);

  const items = invoice.items || [];
  
  items.forEach((item, index) => {
    doc.font('Helvetica').fontSize(7);
    const itemY = doc.y;
    
    const nombre = String(item.nombre || 'Producto').trim();
    const cantidad = Math.max(1, Number(item.cantidad || 1));
    const precio = Number(item.precio || 0);
    const lineTotal = Number(item.subtotal ?? cantidad * precio);

    doc.text(String(index + 1), left, itemY, { width: 12, lineBreak: false });
    doc.text(nombre, left + 15, itemY, { width: printableWidth * 0.50 });
    const nextY = doc.y;

    doc.text(String(cantidad), left + printableWidth * 0.65, itemY, { width: 18, align: 'right', lineBreak: false });
    doc.text(formatTicketAmount(precio), left + printableWidth * 0.74, itemY, { width: 32, align: 'right', lineBreak: false });
    doc.text(formatTicketAmount(lineTotal), left + printableWidth * 0.90, itemY, { width: printableWidth * 0.10, align: 'right', lineBreak: false });
    
    doc.y = nextY + 2;
  });

  doc.moveDown(0.1);
  if (!isMeasuring) drawDottedRule(doc, left, printableWidth);

  // --- Totales ---
  const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal ?? Math.max(1, Number(item.cantidad || 1)) * Number(item.precio || 0)), 0);
  const impuesto = Number(invoice.ivaTotal ?? invoice.totals?.ivaTotal ?? 0);
  const total = Number(invoice.total ?? invoice.totals?.total ?? subtotal + impuesto);
  const montoPago = Number(invoice.montoRecibido != null ? invoice.montoRecibido : total);
  const cambio = Math.max(0, Number(invoice.cambio ?? 0));
  const pagoLabel = getPaymentTicketLabel(invoice.metodoPago);
  const totalItems = items.length;

  drawTotalRow(doc, left, printableWidth, 'TOTAL ITEMS', totalItems, { isMeasuring });
  drawTotalRow(doc, left, printableWidth, 'SUBTOTAL', subtotal, { isMeasuring });
  drawTotalRow(doc, left, printableWidth, 'IMPUESTO', impuesto, { isMeasuring });
  drawTotalRow(doc, left, printableWidth, 'TOTAL', total, { bold: true, large: true, underline: !isMeasuring, isMeasuring });
  drawTotalRow(doc, left, printableWidth, pagoLabel, montoPago, { isMeasuring });
  drawTotalRow(doc, left, printableWidth, 'CAMBIO', cambio, { isMeasuring });

  doc.moveDown(0.1);
  if (!isMeasuring) drawDottedRule(doc, left, printableWidth);

  // --- Desglose impuestos ---
  doc.font('Helvetica-Bold').fontSize(7);
  const taxHeaderY = doc.y;
  doc.text('TARIFA', left, taxHeaderY, { width: 40, lineBreak: false });
  doc.text('BASE', left + 55, taxHeaderY, { width: 45, align: 'right', lineBreak: false });
  doc.text('IMP', left + 110, taxHeaderY, { width: 35, align: 'right', lineBreak: false });
  doc.text('TOTAL', left + printableWidth - 45, taxHeaderY, { width: 45, align: 'right', lineBreak: false });
  doc.moveDown(0.3);

  const tarifaPrincipal = getTarifaLabel(items[0]?.ivaPorcentaje ?? 19); 
  doc.font('Helvetica').fontSize(7);
  const taxRowY = doc.y;
  doc.text(tarifaPrincipal, left, taxRowY, { width: 40, lineBreak: false });
  doc.text(formatTicketAmount(subtotal), left + 55, taxRowY, { width: 45, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(impuesto), left + 110, taxRowY, { width: 35, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(total), left + printableWidth - 45, taxRowY, { width: 45, align: 'right', lineBreak: false });
  doc.moveDown(0.25);

  const taxTotalY = doc.y;
  doc.font('Helvetica-Bold').fontSize(7);
  doc.text('TOTAL', left, taxTotalY, { width: 40, lineBreak: false });
  doc.text(formatTicketAmount(subtotal), left + 55, taxTotalY, { width: 45, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(impuesto), left + 110, taxTotalY, { width: 35, align: 'right', lineBreak: false });
  doc.text(formatTicketAmount(total), left + printableWidth - 45, taxTotalY, { width: 45, align: 'right', lineBreak: false });
  doc.moveDown(0.2);

  if (!isMeasuring) drawDottedRule(doc, left, printableWidth);

  // --- Información Legal Extra ---
  doc.font('Helvetica').fontSize(7).text('Impuesto nacional al consumo INC', center);
  doc.text('Gran contribuyente', center);
  doc.moveDown(0.3);

  // --- QR ---
  const qrPayload = invoice.cufe || generateInvoiceQR(invoice);
  const qrSize = 75;
  if (!isMeasuring) {
    try {
      const qrBuffer = await buildQrImageBuffer(qrPayload);
      const qrX = left + (printableWidth - qrSize) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
    } catch {
      doc.font('Helvetica').fontSize(7).text('[QR]', center);
    }
  }
  doc.y += qrSize + 4;

  doc.font('Helvetica').fontSize(7).text('cude', center);
  doc.moveDown(0.2);

  // --- Disclaimer Legal ---
  doc.font('Helvetica').fontSize(6.5).text(LEGAL_DISCLAIMER, left + 2, doc.y, {
    width: printableWidth - 4,
    align: 'left'
  });
  
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(7).text(`Elaborado en software ${SOFTWARE_FOOTER.nombre}`, center);
  doc.text(`Nit : ${SOFTWARE_FOOTER.nit} ${SOFTWARE_FOOTER.dv}`, center);

  doc.moveDown(0.3);
  if (!isMeasuring) {
    drawDashedRule(doc, left, printableWidth);
    drawDashedRule(doc, left, printableWidth);
  } else {
    doc.moveDown(0.4);
  }
};

export const buildInvoicePdfBuffer = async (invoice, options = {}) => {
  const isTicket = options.pageSize === '80mm';

  if (isTicket) {
    // ⚡ FACTOR DE CÁLCULO MATEMÁTICO DIRECTO (0 ms)
    // Definimos una altura base fija para el encabezado y pie de página (ej. 430 puntos)
    // Y le sumamos un estimado por cada producto en el tiquete (ej. 14 puntos por fila)
    const baseHeight = 600; 
    const itemHeight = 80;
    const totalItems = (invoice.items || []).length;
    const calculatedHeight = baseHeight + (totalItems * itemHeight);

    // 🖨️ PASADA ÚNICA: Documento real inmediato
    const doc = new PDFDocument({
      size: [TICKET_WIDTH, calculatedHeight],
      margins: { top: 10, bottom: 10, left: 10, right: 10 }, 
      bufferPages: true,
      autoFirstPage: false 
    });

    // Creamos la única página permitida
    doc.addPage();
    doc.page.margins.bottom = 5;

    const stream = new PassThrough();
    const chunks = [];
    doc.pipe(stream);
    stream.on('data', (chunk) => chunks.push(chunk));

    // Ejecutamos el renderizado UNA SOLA VEZ
    await renderTicketContent(invoice, doc, false);
    
    doc.end();
    await once(stream, 'end');
    return Buffer.concat(chunks);
  }

  // --- Renderizado Estándar Factura A4 ---
  const doc = new PDFDocument({ size: DEFAULT_PAGE_SIZE, margins: { top: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN, left: DEFAULT_MARGIN, right: DEFAULT_MARGIN } });
  const stream = new PassThrough();
  const chunks = [];
  doc.pipe(stream);
  stream.on('data', (chunk) => chunks.push(chunk));

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