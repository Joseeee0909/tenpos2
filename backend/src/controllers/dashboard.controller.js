import prisma from '../lib/prisma.js';

const startOfToday = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getDashboardSummary = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const todayStart = startOfToday();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const [
      productosActivos,
      usuarios,
      pedidosPreparando,
      pedidosPendientes,
      mesasOcupadas,
      mesasDisponibles,
      completadasHoy
    ] = await Promise.all([
      prisma.product.count({ where: { empresaId, disponible: { not: false } } }),
      prisma.usuario.count({ where: { empresaId } }),
      prisma.pedido.count({ where: { empresaId, estado: 'preparando' } }),
      prisma.pedido.count({ where: { empresaId, estado: 'pendiente' } }),
      prisma.mesa.count({ where: { empresaId, estado: { in: ['ocupada', 'reservada'] } } }),
      prisma.mesa.count({ where: { empresaId, estado: 'disponible' } }),
      prisma.pedido.aggregate({
        where: {
          empresaId,
          estado: 'entregado',
          fecha: {
            gte: todayStart,
            lt: tomorrowStart
          }
        },
        _count: { id: true },
        _sum: { total: true }
      })
    ]);

    const ordenesCompletadasHoy = Number(completadasHoy._count.id || 0);
    const totalCompletadas = Number(completadasHoy._sum.total || 0);
    const ticketPromedioHoy = ordenesCompletadasHoy ? totalCompletadas / ordenesCompletadasHoy : 0;

    res.json({
      productosActivos,
      usuarios,
      ordenesCompletadasHoy,
      ticketPromedioHoy,
      pedidosPreparando,
      mesasOcupadas,
      mesasDisponibles,
      pedidosPendientes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
