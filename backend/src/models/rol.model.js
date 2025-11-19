import mongoose from 'mongoose';

const rolSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String }
});

export default mongoose.model('Rol', rolSchema);
