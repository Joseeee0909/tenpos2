import Pedido from "../models/pedidos.model.js"

// Crear pedido
export const crearPedido = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      responsable: String(req.body?.responsable || '').trim() || 'Sin asignar'
    }

    const pedido = new Pedido(payload)

    await pedido.save()

    res.status(201).json(pedido)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Obtener todos
export const obtenerPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.find()
      .populate("mesero")
      .populate("productos.productoId")

    res.json(pedidos)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Obtener uno
export const obtenerPedido = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)

    res.json(pedido)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Actualizar
export const actualizarPedido = async (req, res) => {
  try {
    const actual = await Pedido.findById(req.params.id)
    if (!actual) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    const responsable = String(req.body?.responsable || '').trim() || actual.responsable || 'Sin asignar'

    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        responsable
      },
      { new: true }
    )

    res.json(pedido)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Eliminar
export const eliminarPedido = async (req, res) => {
  try {
    await Pedido.findByIdAndDelete(req.params.id)

    res.json({ mensaje: "Pedido eliminado" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}



