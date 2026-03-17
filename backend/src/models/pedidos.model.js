import mongoose from "mongoose"

const pedidoSchema = new mongoose.Schema({
  mesa: {
    type: Number,
    required: true
  },

  mesero: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  responsable: {
    type: String,
    default: "Sin asignar"
  },

  productos: [
    {
      productoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      nombre: String,
      precio: Number,
      cantidad: Number
    }
  ],

  total: {
    type: Number,
    required: true
  },

  estado: {
    type: String,
    enum: ["pendiente","preparando","listo","entregado"],
    default: "pendiente"
  },

  fecha: {
    type: Date,
    default: Date.now
  }
})

const Pedido = mongoose.model("Pedido", pedidoSchema)

export default Pedido