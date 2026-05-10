import fs from 'fs'
import path from 'path'
import Factura from '../models/factura.model.js'
import Pedido from '../models/pedidos.model.js'
import Configuracion from '../models/configuracion.model.js'

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const buildPdfBuffer = (lines) => {
  const content = ['BT','/F1 11 Tf','40 790 Td']
  lines.forEach((l, i) => { if (i>0) content.push('0 -16 Td'); content.push(`(${esc(l)}) Tj`) })
  content.push('ET')
  const stream = content.join('\n')
  const objs = []
  objs.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj')
  objs.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj')
  objs.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 900] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj')
  objs.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj')
  objs.push(`5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`)
  let pdf='%PDF-1.4\n'; const offs=[0]
  objs.forEach(o=>{offs.push(pdf.length); pdf+=o+'\n'})
  const xref=pdf.length
  pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`
  for(let i=1;i<offs.length;i++) pdf += `${String(offs[i]).padStart(10,'0')} 00000 n \n`
  pdf += `trailer << /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

export const getConfig = async (_req,res)=>{
  let c= await Configuracion.findOne({ clave:'facturacion' })
  if(!c) c= await Configuracion.create({ clave:'facturacion' })
  res.json(c.facturacion)
}
export const saveConfig = async (req,res)=>{
  const c = await Configuracion.findOneAndUpdate({ clave:'facturacion' }, { $set:{ facturacion:req.body } }, { upsert:true,new:true })
  res.json(c.facturacion)
}

export const checkoutPedido = async (req,res)=>{
  const { pedidoId, cliente, metodoPago='Efectivo', incluirPropina=false } = req.body
  const pedido = await Pedido.findById(pedidoId)
  if(!pedido) return res.status(404).json({ error:'Pedido no encontrado' })
  const configDoc = await Configuracion.findOne({ clave:'facturacion' }) || await Configuracion.create({ clave:'facturacion' })
  const subtotal = Number(pedido.total || 0)
  const ivaTotal = Math.round(subtotal*0.19)
  const propina = incluirPropina ? Math.round(subtotal*0.1) : 0
  const total = subtotal + ivaTotal + propina
  const numero = String(Date.now())
  const items = (pedido.productos||[]).map(i=>({ nombre:i.nombre, cantidad:Number(i.cantidad||1), precio:Number(i.precio||0) }))
  const factura = await Factura.create({ numero, emisor: configDoc.facturacion, cliente: cliente || { nombre:'Consumidor Final', documento:'000000' }, items, subtotal, ivaTotal, propina, total, metodoPago, pedidoId: pedido._id, mesa: pedido.mesa })
  const lines = [configDoc.facturacion.nombre, configDoc.facturacion.nit, configDoc.facturacion.direccion, configDoc.facturacion.telefono, configDoc.facturacion.resolucion, configDoc.facturacion.responsable, '----------------------------', `Factura de venta: ${configDoc.facturacion.prefijo}`, `Fecha: ${new Date().toLocaleString('es-CO')}`, `Cliente: ${factura.cliente.nombre}`, `Doc: ${factura.cliente.documento}`, '----------------------------', 'CT  Descripcion        Valor']
  items.forEach(i=>lines.push(`${i.cantidad}  ${i.nombre.slice(0,14).padEnd(14,' ')} ${Math.round(i.precio*i.cantidad)}`))
  lines.push('----------------------------', `SUBTOTAL: ${subtotal}`, `IVA: ${ivaTotal}`, `PROPINA: ${propina}`, `TOTAL: ${total}`, `Pago: ${metodoPago}`)
  const dir = path.join(process.cwd(), 'storage', 'facturas')
  ensureDir(dir)
  const filePath = path.join(dir, `${numero}.pdf`)
  fs.writeFileSync(filePath, buildPdfBuffer(lines))
  factura.pdfPath = filePath
  await factura.save()
  pedido.estado = 'entregado'
  await pedido.save()
  res.json({ factura, pdfUrl: `/api/facturas/${numero}/pdf` })
}

export const listFacturas = async (_req,res)=> res.json(await Factura.find().sort({ fecha:-1 }).limit(200))
export const getFacturaPdf = async (req,res)=>{
  const f = await Factura.findOne({ numero:req.params.numero })
  if(!f?.pdfPath || !fs.existsSync(f.pdfPath)) return res.status(404).json({ error:'PDF no encontrado' })
  res.setHeader('Content-Type','application/pdf');
  res.send(fs.readFileSync(f.pdfPath))
}
