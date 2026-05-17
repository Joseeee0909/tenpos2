import Product from '../models/product.model.js'
import Pedido from '../models/pedidos.model.js'
import Mesa from '../models/tabla.model.js'
import User from '../models/user.model.js'

const startOfToday = () => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start
}

export const getDashboardSummary = async (_req, res) => {
  try {
    const todayStart = startOfToday()
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(todayStart.getDate() + 1)

    const [productosActivos, usuarios, pedidosPreparando, pedidosPendientes, mesasOcupadas, mesasDisponibles, completadasHoy] = await Promise.all([
      Product.countDocuments({ disponible: { $ne: false } }),
      User.countDocuments({}),
      Pedido.countDocuments({ estado: 'preparando' }),
      Pedido.countDocuments({ estado: 'pendiente' }),
      Mesa.countDocuments({ estado: { $in: ['ocupada', 'reservada'] } }),
      Mesa.countDocuments({ estado: 'disponible' }),
      Pedido.aggregate([
        { $match: { estado: 'entregado', fecha: { $gte: todayStart, $lt: tomorrowStart } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } }
      ])
    ])

    const delivered = Array.isArray(completadasHoy) && completadasHoy[0]
      ? completadasHoy[0]
      : { count: 0, total: 0 }

    const ordenesCompletadasHoy = Number(delivered.count || 0)
    const totalCompletadas = Number(delivered.total || 0)
    const ticketPromedioHoy = ordenesCompletadasHoy ? totalCompletadas / ordenesCompletadasHoy : 0

    res.json({
      productosActivos,
      usuarios,
      ordenesCompletadasHoy,
      ticketPromedioHoy,
      pedidosPreparando,
      mesasOcupadas,
      mesasDisponibles,
      pedidosPendientes
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
