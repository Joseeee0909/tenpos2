import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

// Prioriza backend/.env y usa .env de la raiz como fallback.
if (fs.existsSync(backendEnvPath)) {
	dotenv.config({ path: backendEnvPath });
} else {
	dotenv.config({ path: rootEnvPath });
}

const mongoURI = process.env.MONGO_URI;

export const connectDB = async () => {
	try {
		await mongoose.connect(mongoURI);
		console.log(`MongoDB conectado en: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
	} catch (err) {
		console.error('Error de conexión a MongoDB:', err);
		process.exit(1);
	}
};