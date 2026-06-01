import fs from 'fs'
import path from 'path'
import Factura from '../models/factura.model.js'
import Pedido from '../models/pedidos.model.js'
import Configuracion from '../models/configuracion.model.js'
import TablaModel from '../models/tabla.model.js'
import Product from '../models/product.model.js'
import { pickFields, toBoolean, toNumber, toTrimmedString } from '../utils/requestPayload.js'

const FACTURACION_FIELDS = ['nombre', 'nit', 'direccion', 'telefono', 'resolucion', 'autorizada', 'prefijo', 'responsable']

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const readTaxSettings = (payload = {}) => {
  const tax = payload.taxSettings || {}
  const vatPercent = Number(tax.vatPercent ?? 19)
  const applyVat = tax.applyVat !== false
  const pricesIncludeVat = tax.pricesIncludeVat !== false
  return { vatPercent, applyVat, pricesIncludeVat }
}

const readTaxSettingsFromQuery = (query = {}) => {
  const vatPercent = Number(query.vatPercent ?? 19)
  const applyVat = String(query.applyVat ?? 'true').toLowerCase() !== 'false'
  const pricesIncludeVat = String(query.pricesIncludeVat ?? 'true').toLowerCase() !== 'false'
  return { vatPercent, applyVat, pricesIncludeVat }
}

const buildTotals = (sum, taxSettings) => {
  const base = Math.round(Number(sum || 0))
  const vatRate = taxSettings.applyVat ? taxSettings.vatPercent / 100 : 0

  if (!vatRate) {
    return { subtotal: base, ivaTotal: 0, total: base }
  }

  if (taxSettings.pricesIncludeVat) {
    const subtotal = Math.round(base / (1 + vatRate))
    let ivaTotal = Math.round(subtotal * vatRate)
    const correction = base - (subtotal + ivaTotal)
    if (correction !== 0) ivaTotal += correction
    return { subtotal, ivaTotal, total: base }
  }

  const subtotal = base
  const ivaTotal = Math.round(subtotal * vatRate)
  return { subtotal, ivaTotal, total: subtotal + ivaTotal }
}

const buildPdfBuffer = (lines, options = {}) => {
  const width = Math.round(Number(options.width ?? 350))
  const lineHeight = Math.round(Number(options.lineHeight ?? 16))
  const marginTop = Math.round(Number(options.marginTop ?? 50))
  const marginBottom = Math.round(Number(options.marginBottom ?? 40))
  const marginLeft = Math.round(Number(options.marginLeft ?? 40))
  const safeLineCount = Math.max(1, lines.length)
  const height = Math.max(200, marginTop + marginBottom + (safeLineCount * lineHeight))
  const startY = Math.max(lineHeight, height - marginTop)

  const content = ['BT', '/F1 11 Tf', `${marginLeft} ${startY} Td`]
  lines.forEach((l, i) => { if (i > 0) content.push(`0 -${lineHeight} Td`); content.push(`(${esc(l)}) Tj`) })
  content.push('ET')
  const stream = content.join('\n')
  const objs = []
  objs.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj')
  objs.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj')
  objs.push(`3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj`)
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
  const facturacion = pickFields(req.body, FACTURACION_FIELDS)
  const c = await Configuracion.findOneAndUpdate({ clave:'facturacion' }, { $set:{ facturacion } }, { upsert:true,new:true })
  res.json(c.facturacion)
}

export const checkoutPedido = async (req,res)=>{
  const pedidoId = toTrimmedString(req.body?.pedidoId)
  const cliente = req.body?.cliente && typeof req.body.cliente === 'object' ? req.body.cliente : null
  const metodoPago = toTrimmedString(req.body?.metodoPago, 'Efectivo') || 'Efectivo'
  const incluirPropina = toBoolean(req.body?.incluirPropina, false)
  const propinaPercent = toNumber(req.body?.propinaPercent, 10)

  if (!pedidoId) {
    return res.status(400).json({ error: 'pedidoId requerido' })
  }

  const pedido = await Pedido.findById(pedidoId)
  if(!pedido) return res.status(404).json({ error:'Pedido no encontrado' })
  const configDoc = await Configuracion.findOne({ clave:'facturacion' }) || await Configuracion.create({ clave:'facturacion' })
  const taxSettings = readTaxSettings(req.body || {})
  const baseTotal = Number(pedido.total || 0)
  const totals = buildTotals(baseTotal, taxSettings)
  const tipRate = Number.isFinite(propinaPercent) ? propinaPercent / 100 : 0
  const rawTip = totals.subtotal * tipRate
  const propina = incluirPropina ? Math.round(rawTip / 100) * 100 : 0
  const total = totals.total + propina
  const numero = String(Date.now())
  const pedidoItems = Array.isArray(pedido.productos) ? pedido.productos : []
  const items = pedidoItems.map(i=>({ nombre:i.nombre, cantidad:Number(i.cantidad||1), precio:Number(i.precio||0) }))
  const clienteData = cliente && typeof cliente === 'object'
    ? { nombre: cliente.nombre || 'Consumidor Final', documento: cliente.documento || '000000' }
    : { nombre: 'Consumidor Final', documento: '000000' }

  const prevEstado = String(pedido.estado || '').toLowerCase()
  if (prevEstado !== 'entregado') {
    const productIds = pedidoItems.map((item) => item?.productoId).filter(Boolean)
    if (productIds.length) {
      const products = await Product.find(
        { _id: { $in: productIds } },
        { stock: 1, nombre: 1 }
      )

      const stockById = new Map(products.map((p) => [String(p._id), p]))
      const insufficient = []

      pedidoItems.forEach((item) => {
        const product = stockById.get(String(item.productoId))
        const qty = Math.max(0, Number(item.cantidad || 1))
        if (!product || product.stock < qty) {
          insufficient.push({
            productoId: item.productoId,
            nombre: product?.nombre || item?.nombre || 'Producto',
            stock: product?.stock ?? 0,
            requerido: qty
          })
        }
      })

      if (insufficient.length) {
        return res.status(409).json({
          error: 'Stock insuficiente para completar el pedido',
          items: insufficient
        })
      }

      const updates = pedidoItems.map((item) => ({
        updateOne: {
          filter: { _id: item.productoId },
          update: { $inc: { stock: -Math.abs(Number(item.cantidad || 1)) } }
        }
      }))

      if (updates.length) {
        await Product.bulkWrite(updates)
      }
    }
  }
  const meseroId = pedido.mesero || toTrimmedString(req.body?.mesero, '') || null

  if (!pedido.mesero && meseroId) {
    pedido.mesero = meseroId
  }

  const factura = await Factura.create({
    numero,
    emisor: configDoc.facturacion,
    cliente: clienteData,
    items,
    subtotal: totals.subtotal,
    ivaTotal: totals.ivaTotal,
    propina,
    total,
    metodoPago,
    pedidoId: pedido._id,
    mesero: meseroId,
    mesa: pedido.mesa
  })

  const em = configDoc.facturacion || {}
  const lines = []
  const pushIf = (label, value) => { if (value) lines.push(`${label}${value}`) }

  lines.push(em.nombre || 'FACTURA')
  pushIf('', em.nit)
  pushIf('', em.direccion)
  pushIf('Tel: ', em.telefono)
  pushIf('Resolucion DIAN ', em.resolucion)
  pushIf('Autorizada el: ', em.autorizada)
  pushIf('Prefijo POS Del: ', em.prefijo)
  pushIf('', em.responsable)
  lines.push('----------------------------')
  lines.push(`Factura de venta: ${em.prefijo || 'POS'} - ${numero}`)
  lines.push(`Fecha: ${new Date().toLocaleString('es-CO')}`)
  lines.push(`Cliente: ${factura.cliente.nombre}`)
  lines.push(`C.C / NIT : ${factura.cliente.documento}`)
  lines.push('----------------------------')
  lines.push('CT  Descripcion        Valor')
  items.forEach(i=>lines.push(`${i.cantidad}  ${i.nombre.slice(0,14).padEnd(20,' ')} ${Math.round(i.precio*i.cantidad)}`))
  lines.push('----------------------------')
  lines.push(`SUBTOTAL: ${totals.subtotal}`)
  lines.push(`IVA: ${totals.ivaTotal}`)
  lines.push(`PROPINA: ${propina}`)
  lines.push(`TOTAL: ${total}`)
  lines.push(`Forma de Pago: ${metodoPago}`)
  const dir = path.join(process.cwd(), 'storage', 'facturas')
  ensureDir(dir)
  const filePath = path.join(dir, `${numero}.pdf`)
  fs.writeFileSync(filePath, buildPdfBuffer(lines))
  factura.pdfPath = filePath
  await factura.save()
  pedido.estado = 'entregado'
  await pedido.save()
  await TablaModel.findOneAndUpdate({ numero: Number(pedido.mesa) }, { estado: 'disponible', pedido: null })
  res.json({ factura, pdfUrl: `/api/facturas/${numero}/pdf` })
}

export const previewFactura = async (req, res) => {
  const { pedidoId } = req.query || {}
  if (!pedidoId) return res.status(400).json({ error: 'pedidoId requerido' })

  const pedido = await Pedido.findById(pedidoId)
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })

  const configDoc = await Configuracion.findOne({ clave:'facturacion' }) || await Configuracion.create({ clave:'facturacion' })
  const taxSettings = readTaxSettingsFromQuery(req.query)
  const baseTotal = Number(pedido.total || 0)
  const totals = buildTotals(baseTotal, taxSettings)
  const tipRate = toNumber(req.query.propinaPercent, 0) / 100
  const rawTip = totals.subtotal * tipRate
  const incluirPropina = toBoolean(req.query.incluirPropina, false)
  const propina = incluirPropina ? Math.round(rawTip / 100) * 100 : 0
  const total = totals.total + propina
  const numero = String(Date.now())
  const items = (pedido.productos||[]).map(i=>({ nombre:i.nombre, cantidad:Number(i.cantidad||1), precio:Number(i.precio||0) }))

  const em = configDoc.facturacion || {}
  const lines = []
  const pushIf = (label, value) => { if (value) lines.push(`${label}${value}`) }

  lines.push(em.nombre || 'PRECUENTA')
  pushIf('', em.nit)
  pushIf('', em.direccion)
  pushIf('Tel: ', em.telefono)
  lines.push('----------------------------')
  lines.push(`Precuenta: ${em.prefijo || 'POS'} - ${numero}`)
  lines.push(`Fecha: ${new Date().toLocaleString('es-CO')}`)
  lines.push(`Mesa: ${pedido.mesa || '-'}`)
  lines.push(`Pedido: ${String(pedido._id || '').slice(-6).toUpperCase()}`)
  lines.push('----------------------------')
  lines.push('CT  Descripcion        Valor')
  items.forEach(i=>lines.push(`${i.cantidad}  ${i.nombre.slice(0,14).padEnd(14,' ')} ${Math.round(i.precio*i.cantidad)}`))
  lines.push('----------------------------')
  lines.push(`SUBTOTAL: ${totals.subtotal}`)
  lines.push(`IVA: ${totals.ivaTotal}`)
  lines.push(`PROPINA: ${propina}`)
  lines.push(`TOTAL: ${total}`)

  res.setHeader('Content-Type','application/pdf')
  res.send(buildPdfBuffer(lines))
}

export const listFacturas = async (_req,res)=> {
  const facturas = await Factura.find()
    .populate('mesero')
    .sort({ fecha:-1 })
    .limit(200)
  res.json(facturas)
}
export const getFacturaPdf = async (req,res)=>{
  const f = await Factura.findOne({ numero:req.params.numero })
  if(!f?.pdfPath || !fs.existsSync(f.pdfPath)) return res.status(404).json({ error:'PDF no encontrado' })
  res.setHeader('Content-Type','application/pdf');
  res.send(fs.readFileSync(f.pdfPath))
}
