import mongoose from 'mongoose';

const mongoURI = 'mongodb://localhost:27017/TenPosBd';

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