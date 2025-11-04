import express from 'express';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { use } from 'react';

const app = express();
app.use(express.json());
app.disable('x-powered-by')
app.use('/api' ,authRoutes);
app.use ('/api', userRoutes);




export default app;
