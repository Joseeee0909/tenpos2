import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { once } from 'events';

const DEFAULT_PAGE_SIZE = 'A4';
const DEFAULT_MARGIN = 36;

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

export const formatDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = String(hours % 12 === 0 ? 12 : hours % 12).padStart(2, '0');
  return `${day}/${month}/${year} ${hour12}:${minutes} ${ampm}`;
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  credit_card: 'Tarjeta Crédito',
  debit_card: 'Tarjeta Débito',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata'
};

export const translatePaymentMethod = (method) => {
  if (!method) return PAYMENT_METHOD_LABELS.cash;
  const value = String(method).trim();
  const normalized = value.toLowerCase();
  return PAYMENT_METHOD_LABELS[normalized] || value;
};

export const buildInvoicePdfBuffer = async (invoice, options = {}) => {
  const pageSize = options.pageSize === '80mm' ? [226, 1200] : DEFAULT_PAGE_SIZE;
  const isTicket = options.pageSize === '80mm';
  const doc = new PDFDocument({ size: pageSize, margins: isTicket ? { top: 8, bottom: 8, left: 8, right: 8 } : { top: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN, left: DEFAULT_MARGIN, right: DEFAULT_MARGIN } });
  const stream = new PassThrough();
  const chunks = [];
  doc.pipe(stream);
  stream.on('data', (chunk) => chunks.push(chunk));

  const invoiceNumber = String(invoice.numero || 'N/A');
  const prefix = String(invoice.prefijo || 'POS').trim().toUpperCase();
  const title = invoice.title || 'FACTURA';
  const company = invoice.emisor || {};
  const client = invoice.cliente || {};
  const taxSettings = invoice.taxSettings || {};

  // Ticket (80mm) optimized layout
  if (isTicket) {
    const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const center = { align: 'center' };

    doc.font('Helvetica-Bold').fontSize(14).text('TENPOS', center);
    doc.moveDown(0.1);
    const nitValue = String(company.nit || '800200100').trim();
    const dvValue = company.dv ? `-${company.dv}` : '';
    doc.font('Helvetica').fontSize(8).text(`NIT: ${nitValue}${dvValue}`, center);
    doc.text(company.direccion || 'Cali, Colombia', center);
    doc.text(`Tel: ${company.telefono || '3001234567'}`, center);
    doc.text(company.email || 'empresa@email.com', center);
    doc.moveDown(0.2);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

    doc.moveDown(0.1);
    doc.font('Helvetica-Bold').fontSize(10).text(`${title} ${invoiceNumber}`, center);
    doc.font('Helvetica').fontSize(8).text(`Estado: ${invoice.estado || 'GENERADA'}`, center);
    doc.font('Helvetica').fontSize(8).text(`Fecha: ${formatDateTime(invoice.fecha)}`, center);
    doc.moveDown(0.2);

    // Cliente
    doc.font('Helvetica-Bold').fontSize(9).text('CLIENTE', center);
    doc.moveDown(0.05);
    doc.font('Helvetica').fontSize(8).text(client.nombre || 'Consumidor Final', { align: 'left' });
    doc.font('Helvetica').fontSize(8).text(`${client.tipoDocumento || 'CC'} ${client.numeroDocumento || '222222222222'}`, { align: 'left' });
    doc.moveDown(0.1);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

    // Productos - ticket style
    doc.moveDown(0.1);
    doc.font('Helvetica-Bold').fontSize(9).text('PRODUCTOS', { align: 'left' });
    doc.moveDown(0.05);
    doc.font('Helvetica').fontSize(9);
    for (const item of invoice.items || []) {
      const qtyLabel = `${item.cantidad}x ${String(item.nombre || 'Producto')}`;
      doc.text(qtyLabel, { width: printableWidth, align: 'left' });
      const unitLine = `${formatCurrency(item.precio)} c/u`;
      doc.text(unitLine, { align: 'left' });
      doc.text(`IVA ${Number(item.ivaPorcentaje || 0).toFixed(0)}%`, { align: 'left' });
      doc.font('Helvetica-Bold').text(`Total: ${formatCurrency(item.total)}`, { align: 'left' });
      doc.font('Helvetica').moveDown(0.1);
    }

    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.1);

    // Totals: single-column with dotted leaders
    const drawLeader = (label, value, opts = {}) => {
      const fontSize = opts.large ? 10 : 9;
      const bold = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(bold).fontSize(fontSize);
      const left = label || '';
      const right = value || '';
      const lw = doc.widthOfString(left);
      const rw = doc.widthOfString(right);
      const dotW = doc.widthOfString('.');
      const available = printableWidth - lw - rw - 6; // small gap
      const dotsCount = Math.max(0, Math.floor(available / dotW));
      const dots = '.'.repeat(dotsCount);
      doc.text(left + dots + ' ' + right, { align: 'left' });
    };

    drawLeader('Subtotal', formatCurrency(invoice.totals.subtotal));
    drawLeader(`IVA (${invoice.items?.[0]?.ivaPorcentaje ?? 19}%)`, formatCurrency(invoice.totals.ivaTotal));
    drawLeader('Propina', formatCurrency(invoice.totals.propina));
    drawLeader('Descuento', formatCurrency(invoice.totals.descuento || 0));
    doc.moveDown(0.05);
    drawLeader('TOTAL', formatCurrency(invoice.totals.total), { bold: true, large: true });
    doc.moveDown(0.2);

    // Forma de pago
    doc.font('Helvetica-Bold').fontSize(9).text('Forma de Pago', { align: 'left' });
    doc.font('Helvetica').fontSize(9).text(translatePaymentMethod(invoice.metodoPago), { align: 'left' });
    doc.moveDown(0.1);

    // Informacion tributaria compacta
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text('INFORMACIÓN TRIBUTARIA', { align: 'left' });
    doc.font('Helvetica').fontSize(8).text(`Resolución: ${taxSettings.resolucion || 'No configurado'}`);
    doc.font('Helvetica').fontSize(8).text(`Prefijo: ${taxSettings.prefijoAutorizado || prefix}`);
    doc.font('Helvetica').fontSize(8).text(`Rango: ${taxSettings.rangoAutorizado || 'No configurado'}`);
    doc.moveDown(0.1);

    // Facturación electrónica (only if present)
    if (invoice.cufe || invoice.dianStatus) {
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.font('Helvetica-Bold').fontSize(9).text('FACTURACIÓN ELECTRÓNICA', { align: 'left' });
      if (invoice.cufe) doc.font('Helvetica').fontSize(8).text(`CUFE: ${invoice.cufe}`);
      if (invoice.dianStatus) doc.font('Helvetica').fontSize(8).text(`Estado DIAN: ${invoice.dianStatus}`);
      doc.moveDown(0.1);
    }

    // QR centered
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(9).text('Escanee para verificar', { align: 'center' });
    doc.font('Helvetica').fontSize(8).text(generateInvoiceQR(invoice), { align: 'center' });
    doc.moveDown(0.2);

    // Footer
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.font('Helvetica').fontSize(8).text('Gracias por su compra', { align: 'center' });
    doc.font('Helvetica').fontSize(8).text('Factura generada por TENPOS', { align: 'center' });
    doc.font('Helvetica').fontSize(8).text('Compatible con DIAN', { align: 'center' });

    doc.end();
    await once(stream, 'end');
    return Buffer.concat(chunks);
  }

  // Default A4-style layout (unchanged)
  const companyName = 'TENPOS';
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
  if (client?.email) doc.text(`Correo: ${client.email}`);
  if (client?.telefono) doc.text(`Teléfono: ${client.telefono}`);
  if (client?.direccion) doc.text(`Dirección: ${client.direccion}`);
  doc.moveDown(0.4);
  doc.lineWidth(1).strokeColor('#444444').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(10).text('PRODUCTOS');
  doc.moveDown(0.1);
  doc.font('Helvetica-Bold').fontSize(9);
  const tableLeft = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const qtyWidth = Math.max(32, Math.round(tableWidth * 0.10));
  const unitWidth = Math.max(70, Math.round(tableWidth * 0.18));
  const ivaWidth = Math.max(50, Math.round(tableWidth * 0.12));
  const totalWidth = Math.max(70, Math.round(tableWidth * 0.18));
  const descWidth = tableWidth - qtyWidth - unitWidth - ivaWidth - totalWidth - 16;

  const qtyX = tableLeft;
  const descX = qtyX + qtyWidth + 4;
  const unitX = descX + descWidth + 4;
  const ivaX = unitX + unitWidth + 4;
  const totalX = ivaX + ivaWidth + 4;

  const headerY = doc.y;
  doc.text('Cant', qtyX, headerY, { width: qtyWidth, align: 'center' });
  doc.text('Descripción', descX, headerY, { width: descWidth });
  doc.text('Unitario', unitX, headerY, { width: unitWidth, align: 'right' });
  doc.text('IVA', ivaX, headerY, { width: ivaWidth, align: 'right' });
  doc.text('Total', totalX, headerY, { width: totalWidth, align: 'right' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9);

  (invoice.items || []).forEach((item) => {
    const startY = doc.y;
    const description = String(item.nombre || 'Producto');
    const descriptionHeight = doc.heightOfString(description, { width: descWidth });
    const rowHeight = Math.max(descriptionHeight, 14);

    doc.text(String(item.cantidad), qtyX, startY, { width: qtyWidth, align: 'center' });
    doc.text(description, descX, startY, { width: descWidth });
    doc.text(formatCurrency(item.precio), unitX, startY, { width: unitWidth, align: 'right' });
    doc.text(`${Number(item.ivaPorcentaje || 0).toFixed(0)}%`, ivaX, startY, { width: ivaWidth, align: 'right' });
    doc.text(formatCurrency(item.total), totalX, startY, { width: totalWidth, align: 'right' });

    doc.y = startY + rowHeight + 6;
  });

  doc.moveDown(0.4);
  doc.lineWidth(1).strokeColor('#444444').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  const totalsLeft = doc.page.width - doc.page.margins.right - totalWidth - 60;
  const labelWidth = totalWidth + 40;
  const valuesX = totalX;
  doc.font('Helvetica').fontSize(9);
  doc.text('Subtotal:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.subtotal), valuesX, doc.y, { width: totalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text(`IVA (${invoice.items?.[0]?.ivaPorcentaje ?? 19}%):`, totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.ivaTotal), valuesX, doc.y, { width: totalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text('Propina:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.propina), valuesX, doc.y, { width: totalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text('Descuentos:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.descuento || 0), valuesX, doc.y, { width: totalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica-Bold').text('TOTAL:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.text(formatCurrency(invoice.totals.total), valuesX, doc.y, { width: totalWidth, align: 'right' });
  doc.moveDown(0.6);

  doc.font('Helvetica-Bold').fontSize(10).text('Forma de Pago:');
  doc.font('Helvetica').fontSize(9).text(paymentMethod);
  doc.moveDown(0.4);

  doc.lineWidth(1).strokeColor('#444444').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(10).text('INFORMACIÓN TRIBUTARIA');
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text(`Resolución DIAN: ${taxSettings.resolucion || 'No configurado'}`);
  doc.text(`Prefijo autorizado: ${taxSettings.prefijoAutorizado || 'No configurado'}`);
  doc.text(`Rango autorizado: ${taxSettings.rangoAutorizado || 'No configurado'}`);
  doc.moveDown(0.4);
  doc.lineWidth(1).strokeColor('#444444').moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(10).text('FACTURACIÓN ELECTRÓNICA');
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text('QR preparado para futura integración DIAN');
  doc.text(generateInvoiceQR(invoice));
  doc.moveDown(0.6);

  doc.font('Helvetica').fontSize(9).text('Gracias por su compra');
  doc.text('Factura generada por TENPOS');
  doc.text('Compatible con impresoras térmicas 80mm y formato PDF A4');

  doc.end();
  await once(stream, 'end');
  return Buffer.concat(chunks);
};
