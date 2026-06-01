import { Router } from 'express'
import { checkoutPedido, getConfig, getFacturaPdf, listFacturas, previewFactura, saveConfig } from '../controllers/factura.controller.js'
import { verifyToken, requirePermission } from '../middlewares/auth.middleware.js'
const r = Router()
r.get('/configuracion/facturacion', verifyToken, requirePermission('ver_ventas', 'gestionar_ventas'), getConfig)
r.put('/configuracion/facturacion', verifyToken, requirePermission('gestionar_ventas'), saveConfig)
r.post('/ventas/checkout', verifyToken, requirePermission('gestionar_ventas'), checkoutPedido)
r.get('/ventas', verifyToken, requirePermission('ver_ventas', 'gestionar_ventas'), listFacturas)
r.get('/facturas/preview', verifyToken, requirePermission('ver_ventas', 'gestionar_ventas'), previewFactura)
r.get('/facturas/:numero/pdf', verifyToken, requirePermission('ver_ventas', 'gestionar_ventas'), getFacturaPdf)
export default r
