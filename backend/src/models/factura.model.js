import mongoose from 'mongoose'

const facturaSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  emisor: { nombre: String, nit: String, direccion: String, telefono: String, resolucion: String, prefijo: String, responsable: String },
  cliente: { nombre: String, documento: String, direccion: String },
  items: [{ nombre: String, cantidad: Number, precio: Number }],
  subtotal: Number,
  ivaTotal: Number,
  propina: Number,
  total: Number,
  metodoPago: String,
  pedidoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido' },
  mesa: Number,
  pdfPath: String,
  fecha: { type: Date, default: Date.now }
})

export default mongoose.model('Factura', facturaSchema)
