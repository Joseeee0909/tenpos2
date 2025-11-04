import express from 'express';
import authRoutes from './routes/auth.routes.js';

const app = express();
app.use(express.json());
app.disable('x-powered-by')
app.use('/api' ,authRoutes);




export default app;
