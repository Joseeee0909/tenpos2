import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import rolRoutes from './routes/rol.routes.js'
import productRoutes from './routes/product.routes.js'
import pedidoRoutes from './routes/pedido.routes.js'
import tablaRoutes from './routes/tabla.routes.js'

const app = express()

app.use(express.json())

app.use(cors({
  origin: process.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization']
}))

app.disable('x-powered-by')

// rutas
app.use('/api', authRoutes)
app.use('/api/roles', rolRoutes)
app.use('/api/usuarios', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/pedidos', pedidoRoutes)
app.use('/api/mesas', tablaRoutes)

export default app
