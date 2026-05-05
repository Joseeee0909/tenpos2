import mongoose from 'mongoose';

const mesaSchema = new mongoose.Schema({
  numero: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  capacidad: {
    type: Number,
    default: 4
  },
  estado: {
    type: String,
    enum: ['disponible', 'ocupada', 'reservada'],
    default: 'disponible'
  },
  pedido: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Mesa', mesaSchema);
