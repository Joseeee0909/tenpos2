import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import rolRoutes from './routes/rol.routes.js';
import productRoutes from './routes/product.routes.js';

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // URL de tu frontend Vite
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.disable('x-powered-by')
app.use('/api' ,authRoutes);
app.use('/api/roles', rolRoutes);
app.use("/api/usuarios", userRoutes);
app.use('/api/products', productRoutes);





export default app;
