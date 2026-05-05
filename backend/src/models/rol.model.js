import mongoose from 'mongoose';

const rolSchema = new mongoose.Schema({
  idrol: { type: String, required: true, unique: true, trim: true },
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String, default: '' },
  color: { type: String, default: '#7c3aed' },
  permisos: { type: [String], default: [] },
  activo: { type: Boolean, default: true }
});

export default mongoose.model('Rol', rolSchema);
