import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import rolRoutes from './routes/rol.routes.js'
import productRoutes from './routes/product.routes.js'
import pedidoRoutes from './routes/pedido.routes.js'
import tablaRoutes from './routes/tabla.routes.js'
import facturaRoutes from './routes/factura.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import auditoriaRoutes from './routes/auditoria.routes.js'
import recetaRoutes from './routes/receta.routes.js'
import materiaPrimaRoutes from './routes/materiaPrima.routes.js'
import { auditTrail } from './middlewares/audit.middleware.js'

const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

const frontendOrigin = String(process.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

app.use(cors({
  origin: frontendOrigin,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization']
}))

app.disable('x-powered-by')
app.use(auditTrail)

// rutas
app.use('/api', authRoutes)
app.use('/api/roles', rolRoutes)
app.use('/api/usuarios', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/pedidos', pedidoRoutes)
app.use('/api/mesas', tablaRoutes)
app.use('/api', facturaRoutes)
app.use('/api', dashboardRoutes)
app.use('/api', auditoriaRoutes)
app.use('/api/recetas', recetaRoutes)
app.use('/api/materias-primas', materiaPrimaRoutes)

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ mensaje: 'Error interno del servidor' })
})

export default app
