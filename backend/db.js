import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Carga las variables de entorno desde el archivo .env

const mongoURI = process.env.MONGO_URI;

export const connectDB = async () => {
	try {
		await mongoose.connect(mongoURI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log(`MongoDB conectado en: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
	} catch (err) {
		console.error('Error de conexión a MongoDB:', err);
		process.exit(1);
	}
};