import { Router } from 'express'
import { checkoutPedido, getConfig, getFacturaPdf, listFacturas, saveConfig } from '../controllers/factura.controller.js'
const r = Router()
r.get('/configuracion/facturacion', getConfig)
r.put('/configuracion/facturacion', saveConfig)
r.post('/ventas/checkout', checkoutPedido)
r.get('/ventas', listFacturas)
r.get('/facturas/:numero/pdf', getFacturaPdf)
export default r
