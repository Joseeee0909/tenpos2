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

export const buildInvoicePdfBuffer = async (invoice, options = {}) => {
  const pageSize = options.pageSize === '80mm' ? [226, 1200] : DEFAULT_PAGE_SIZE;
  const doc = new PDFDocument({ size: pageSize, margins: { top: DEFAULT_MARGIN, bottom: DEFAULT_MARGIN, left: DEFAULT_MARGIN, right: DEFAULT_MARGIN } });
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

  doc.font('Helvetica-Bold').fontSize(14).text(company.razonSocial || 'SIIGO S.A.S', { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).text(`NIT: ${company.nit}${company.dv ? `-${company.dv}` : ''}`, { align: 'center' });
  doc.text(`Dirección: ${company.direccion || ''}`, { align: 'center' });
  doc.text(`Teléfono: ${company.telefono || ''}`, { align: 'center' });
  doc.text(`Correo: ${company.email || ''}`, { align: 'center' });
  doc.moveDown(0.4);
  doc.lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12).text(`${title} ${invoiceNumber}`, { align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Estado: ${invoice.estado || 'GENERADA'}`, { align: 'center' });
  doc.text(`Fecha: ${new Date(invoice.fecha || Date.now()).toLocaleString('es-CO')}`, { align: 'center' });
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(10).text('Información Tributaria');
  doc.font('Helvetica').fontSize(9).text(`Resolución DIAN: ${company.resolucion || 'No configurado'}`);
  doc.text(`Rango autorizado: ${company.rangoAutorizado || 'No configurado'}`);
  doc.text(`Prefijo autorizado: ${prefix || 'No configurado'}`);
  doc.moveDown(0.4);
  doc.lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(10).text('Cliente');
  doc.font('Helvetica').fontSize(9).text(`Cliente: ${client.nombre || 'Consumidor Final'}`);
  doc.text(`Documento: ${client.tipoDocumento || 'CC'} ${client.numeroDocumento || '222222222222'}`);
  doc.text(`Correo: ${client.email || '-'}`);
  doc.text(`Teléfono: ${client.telefono || '-'}`);
  if (client.direccion) doc.text(`Dirección: ${client.direccion}`);
  doc.moveDown(0.4);
  doc.lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(9);
  const tableLeft = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const qtyWidth = Math.max(32, Math.round(tableWidth * 0.10));
  const subtotalWidth = Math.max(70, Math.round(tableWidth * 0.18));
  const priceWidth = Math.max(70, Math.round(tableWidth * 0.18));
  const ivaWidth = Math.max(50, Math.round(tableWidth * 0.12));
  const descWidth = tableWidth - qtyWidth - priceWidth - ivaWidth - subtotalWidth - 12;

  const columnY = doc.y;
  doc.text('Cant', tableLeft, columnY, { width: qtyWidth, continued: true });
  doc.text('Descripción', tableLeft + qtyWidth + 4, columnY, { width: descWidth, continued: true });
  doc.text('Valor Unitario', tableLeft + qtyWidth + descWidth + 8, columnY, { width: priceWidth, continued: true, align: 'right' });
  doc.text('IVA', tableLeft + qtyWidth + descWidth + priceWidth + 12, columnY, { width: ivaWidth, continued: true, align: 'right' });
  doc.text('Subtotal', tableLeft + qtyWidth + descWidth + priceWidth + ivaWidth + 16, columnY, { width: subtotalWidth, align: 'right' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(9);

  invoice.items.forEach((item) => {
    const startY = doc.y;
    doc.text(String(item.cantidad), tableLeft, startY, { width: qtyWidth });
    doc.text(String(item.nombre || 'Producto'), tableLeft + qtyWidth + 4, startY, { width: descWidth });
    const descriptionHeight = doc.heightOfString(String(item.nombre || 'Producto'), { width: descWidth });
    doc.text(formatCurrency(item.precio), tableLeft + qtyWidth + descWidth + 8, startY, { width: priceWidth, align: 'right' });
    doc.text(`${Number(item.ivaPorcentaje || 0).toFixed(0)}%`, tableLeft + qtyWidth + descWidth + priceWidth + 12, startY, { width: ivaWidth, align: 'right' });
    doc.text(formatCurrency(item.subtotal), tableLeft + qtyWidth + descWidth + priceWidth + ivaWidth + 16, startY, { width: subtotalWidth, align: 'right' });
    doc.y = startY + descriptionHeight + 4;
  });

  doc.moveDown(0.4);
  doc.lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);

  const totalsLeft = doc.page.width - doc.page.margins.right - subtotalWidth - 60;
  const labelWidth = subtotalWidth + 40;
  const valuesX = tableLeft + qtyWidth + descWidth + priceWidth + ivaWidth + 16;
  doc.font('Helvetica').fontSize(9);
  doc.text('Subtotal general:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.subtotal), valuesX, doc.y, { width: subtotalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text('IVA total:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.ivaTotal), valuesX, doc.y, { width: subtotalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text('Propina:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.propina), valuesX, doc.y, { width: subtotalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica').fontSize(9).text('Descuentos:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.totals.descuento || 0), valuesX, doc.y, { width: subtotalWidth, align: 'right' });
  doc.moveDown(0.1);
  doc.font('Helvetica-Bold').text('TOTAL:', totalsLeft, doc.y, { width: labelWidth, align: 'right' });
  doc.text(formatCurrency(invoice.totals.total), valuesX, doc.y, { width: subtotalWidth, align: 'right' });
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(9).text(`Forma de Pago: ${invoice.metodoPago || 'Efectivo'}`);
  if (invoice.cufe) doc.text(`CUFE: ${invoice.cufe}`);
  if (invoice.dianStatus) doc.text(`Estado DIAN: ${invoice.dianStatus}`);
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').fontSize(9).text('QR preparado para facturación electrónica', { align: 'left' });
  doc.font('Helvetica').fontSize(8).text(generateInvoiceQR(invoice), { align: 'left' });
  doc.moveDown(0.6);
  doc.font('Helvetica-Oblique').fontSize(8).text('Factura generada con sistema POS. Diseño compatible con impresoras 80mm y A4.', { align: 'center' });

  doc.end();
  await once(stream, 'end');
  return Buffer.concat(chunks);
};
