import mongoose from 'mongoose';

const rolSchema = new mongoose.Schema({
  idrol: { type: String, required: true, unique: true, trim: true },
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String }
});

export default mongoose.model('Rol', rolSchema);
