import Pedido from "../models/pedidos.model.js"
import Product from "../models/product.model.js"

// Crear pedido
export const crearPedido = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      responsable: String(req.body?.responsable || '').trim() || 'Sin asignar'
    }

    const items = Array.isArray(payload.productos) ? payload.productos : []
    const productIds = items.map((item) => item?.productoId).filter(Boolean)
    if (productIds.length) {
      const products = await Product.find(
        { _id: { $in: productIds } },
        { stock: 1, nombre: 1, disponible: 1 }
      )

      const stockById = new Map(products.map((p) => [String(p._id), p]))
      const insufficient = []

      items.forEach((item) => {
        const product = stockById.get(String(item.productoId))
        const qty = Math.max(0, Number(item.cantidad || 1))
        if (!product || product.disponible === false || product.stock < qty) {
          insufficient.push({
            productoId: item.productoId,
            nombre: product?.nombre || item?.nombre || 'Producto',
            stock: product?.stock ?? 0,
            disponible: product?.disponible ?? false,
            requerido: qty
          })
        }
      })

      if (insufficient.length) {
        return res.status(409).json({
          error: 'Producto no disponible o stock insuficiente para crear el pedido',
          items: insufficient
        })
      }
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

    const nextEstado = String(req.body?.estado || actual.estado || '').toLowerCase()

    const prevEstado = String(actual.estado || '').toLowerCase()

    // Descontar stock solo cuando el pedido pasa a "entregado"
    if (prevEstado !== 'entregado' && nextEstado === 'entregado') {
      const items = Array.isArray(actual.productos) ? actual.productos : []
      const productIds = items.map((item) => item?.productoId).filter(Boolean)

      if (productIds.length) {
        const products = await Product.find(
          { _id: { $in: productIds } },
          { stock: 1, nombre: 1 }
        )

        const stockById = new Map(products.map((p) => [String(p._id), p]))
        const insufficient = []

        items.forEach((item) => {
          const product = stockById.get(String(item.productoId))
          const qty = Math.max(0, Number(item.cantidad || 1))
          if (!product || product.stock < qty) {
            insufficient.push({
              productoId: item.productoId,
              nombre: product?.nombre || item?.nombre || 'Producto',
              stock: product?.stock ?? 0,
              requerido: qty
            })
          }
        })

        if (insufficient.length) {
          return res.status(409).json({
            error: 'Stock insuficiente para completar el pedido',
            items: insufficient
          })
        }

        const updates = items.map((item) => ({
          updateOne: {
            filter: { _id: item.productoId },
            update: { $inc: { stock: -Math.abs(Number(item.cantidad || 1)) } }
          }
        }))

        if (updates.length) {
          await Product.bulkWrite(updates)
        }
      }
    }

    const pedido = await Pedido.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        responsable
      },
      { new: true }
    )

    // La venta se crea cuando el pago se confirma en el modulo de cobro.

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



