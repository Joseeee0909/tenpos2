import prisma from '../lib/prisma.js';
import { asNumber, withId } from '../lib/prismaUtils.js';

const mapMesa = (mesa) => {
  if (!mesa) return mesa;
  const activePedido = Array.isArray(mesa.pedidos)
    ? mesa.pedidos.find((pedido) => pedido.estado !== 'entregado') || null
    : null;

  return withId({
    ...mesa,
    pedido: activePedido,
    pedidos: mesa.pedidos
  });
};

class TablaController {
  static async obtenerTablas(req, res) {
    try {
      const tablas = await prisma.mesa.findMany({
        where: { empresaId: req.user.empresaId },
        include: {
          pedidos: {
            where: { estado: { not: 'entregado' } },
            orderBy: { fecha: 'desc' },
            take: 1,
            select: {
              id: true,
              estado: true,
              responsable: true,
              total: true,
              fecha: true,
              productos: { select: { cantidad: true, precio: true, nombre: true } }
            }
          }
        },
        orderBy: { numero: 'asc' }
      });

      res.json(tablas.map(mapMesa));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async obtenerTabla(req, res) {
    try {
      const tabla = await prisma.mesa.findFirst({
        where: {
          id: req.params.id,
          empresaId: req.user.empresaId
        },
        include: {
          pedidos: {
            where: { estado: { not: 'entregado' } },
            orderBy: { fecha: 'desc' },
            take: 1,
            select: {
              id: true,
              estado: true,
              responsable: true,
              total: true,
              fecha: true,
              productos: { select: { cantidad: true, precio: true, nombre: true } }
            }
          }
        }
      });

      if (!tabla) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
      res.json(mapMesa(tabla));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async crearTabla(req, res) {
    try {
      const numero = asNumber(req.body?.numero, NaN);
      const capacidad = asNumber(req.body?.capacidad, 4);

      if (!Number.isFinite(numero)) {
        return res.status(400).json({ mensaje: 'El numero de mesa es requerido' });
      }

      const existente = await prisma.mesa.findFirst({
        where: {
          empresaId: req.user.empresaId,
          numero
        }
      });

      if (existente) return res.status(409).json({ mensaje: 'La mesa ya existe' });

      const tabla = await prisma.mesa.create({
        data: {
          empresaId: req.user.empresaId,
          numero,
          capacidad,
          estado: 'disponible'
        }
      });

      res.status(201).json({ mensaje: 'Mesa creada', tabla: mapMesa(tabla) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async actualizarTabla(req, res) {
    try {
      const tablaActual = await prisma.mesa.findFirst({
        where: {
          id: req.params.id,
          empresaId: req.user.empresaId
        }
      });

      if (!tablaActual) return res.status(404).json({ mensaje: 'Mesa no encontrada' });

      const payload = {};

      if (typeof req.body.numero !== 'undefined') payload.numero = asNumber(req.body.numero, tablaActual.numero);
      if (typeof req.body.capacidad !== 'undefined') payload.capacidad = asNumber(req.body.capacidad, tablaActual.capacidad);

      if (typeof req.body.estado !== 'undefined') {
        const estadoSolicitado = String(req.body.estado);

        if (estadoSolicitado !== 'ocupada') {
          const pedidoActivo = await prisma.pedido.findFirst({
            where: {
              empresaId: req.user.empresaId,
              mesaId: tablaActual.id,
              estado: { not: 'entregado' }
            },
            select: { id: true, estado: true }
          });

          if (pedidoActivo) {
            return res.status(409).json({
              mensaje: 'Esta mesa tiene un pedido activo y debe permanecer ocupada hasta registrar el pago.'
            });
          }
        }

        payload.estado = estadoSolicitado;
      }

      const tabla = await prisma.mesa.update({
        where: { id: req.params.id, empresaId: req.user.empresaId },
        data: payload,
        include: {
          pedidos: {
            where: { estado: { not: 'entregado' } },
            orderBy: { fecha: 'desc' },
            take: 1,
            select: {
              id: true,
              estado: true,
              responsable: true,
              total: true,
              fecha: true,
              productos: { select: { cantidad: true, precio: true, nombre: true } }
            }
          }
        }
      });

      res.json(mapMesa(tabla));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async eliminarTabla(req, res) {
    try {
      const tabla = await prisma.mesa.delete({
        where: {
          id: req.params.id,
          empresaId: req.user.empresaId
        }
      });

      res.json({ mensaje: 'Mesa eliminada', tabla: mapMesa(tabla) });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ mensaje: 'Mesa no encontrada' });
      }
      res.status(500).json({ error: err.message });
    }
  }

  static async inicializarMesas(req, res) {
    try {
      const tablas = await prisma.mesa.findMany({
        where: { empresaId: req.user.empresaId },
        orderBy: { numero: 'asc' }
      });

      if (tablas.length === 0) {
        await prisma.mesa.createMany({
          data: Array.from({ length: 10 }, (_, index) => ({
            empresaId: req.user.empresaId,
            numero: index + 1,
            capacidad: 4,
            estado: 'disponible'
          }))
        });

        const created = await prisma.mesa.findMany({
          where: { empresaId: req.user.empresaId },
          orderBy: { numero: 'asc' }
        });

        return res.status(201).json({
          mensaje: 'Mesas inicializadas',
          tablas: created.map(mapMesa)
        });
      }

      res.json({
        mensaje: 'Mesas ya existen',
        tablas: tablas.map(mapMesa)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default TablaController;
