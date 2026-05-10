import mongoose from "mongoose";

const ventaSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pedido"
  },
  mesa: {
    type: Number
  },
  cliente: {
    type: String,
    trim: true,
    default: ""
  },
  mesero: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  productos: [
    {
      productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      nombre: String,
      cantidad: Number,
      precio: Number,
      total: Number
    }
  ],
  subtotal: {
    type: Number,
    default: 0
  },
  iva: {
    type: Number,
    default: 0
  },
  propina: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  metodoPago: {
    type: String,
    default: "Efectivo"
  },
  estado: {
    type: String,
    enum: ["completada", "pendiente", "reembolsada"],
    default: "completada"
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Venta", ventaSchema);
