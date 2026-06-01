import prisma from "../lib/prisma.js";
import { asNumber, asString, mapVenta } from "../lib/prismaUtils.js";

const VAT_RATE = 0.19;

const ventaInclude = {
  mesero: true,
  pedido: true,
  items: {
    include: { producto: true }
  }
};

const computeTotalsFromTotal = (total, rate = VAT_RATE) => {
  const safeTotal = Math.round(Number(total || 0));
  if (!rate) {
    return { subtotal: safeTotal, iva: 0 };
  }
  const subtotal = Math.round(safeTotal / (1 + rate));
  let iva = Math.round(subtotal * rate);
  const correction = safeTotal - (subtotal + iva);
  if (correction !== 0) iva += correction;
  return { subtotal, iva };
};

const buildSaleNumber = () => `V-${Date.now()}`;

const normalizeItems = (productos) => Array.isArray(productos)
  ? productos.map((item) => {
      const cantidad = Math.max(1, asNumber(item?.cantidad, 1));
      const precio = asNumber(item?.precio, 0);
      return {
        productoId: asString(item?.productoId) || null,
        nombre: asString(item?.nombre, "Producto") || "Producto",
        cantidad,
        precio,
        total: typeof item?.total !== "undefined" ? asNumber(item.total, cantidad * precio) : cantidad * precio
      };
    })
  : [];

export const crearVenta = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const payload = req.body || {};
    const numero = asString(payload.numero, buildSaleNumber()) || buildSaleNumber();
    const total = asNumber(payload.total, NaN);

    if (!Number.isFinite(total) || !total) {
      return res.status(400).json({ error: "El total es obligatorio" });
    }

    const totals = payload.subtotal != null && payload.iva != null
      ? { subtotal: asNumber(payload.subtotal, 0), iva: asNumber(payload.iva, 0) }
      : computeTotalsFromTotal(total, VAT_RATE);

    const venta = await prisma.venta.create({
      data: {
        empresaId,
        numero,
        pedidoId: asString(payload.pedidoId) || null,
        mesa: typeof payload.mesa !== "undefined" ? asNumber(payload.mesa, null) : null,
        cliente: asString(payload.cliente),
        meseroId: asString(payload.mesero || payload.meseroId) || req.user.id || null,
        subtotal: totals.subtotal,
        iva: totals.iva,
        propina: asNumber(payload.propina, 0),
        total,
        metodoPago: asString(payload.metodoPago, "Efectivo") || "Efectivo",
        estado: asString(payload.estado, "completada") || "completada",
        items: {
          create: normalizeItems(payload.productos).map((item) => ({
            productoId: item.productoId,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.total
          }))
        }
      },
      include: ventaInclude
    });

    res.status(201).json(mapVenta(venta));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerVentas = async (req, res) => {
  try {
    const { from, to, status, q, sort } = req.query || {};
    const where = { empresaId: req.user.empresaId };

    if (status && status !== "all") {
      where.estado = String(status);
    }

    if (from || to) {
      where.fecha = {};
      if (from) where.fecha.gte = new Date(from);
      if (to) where.fecha.lte = new Date(to);
    }

    if (q) {
      const possibleMesa = Number(q);
      where.OR = [
        { numero: { contains: String(q), mode: "insensitive" } },
        { cliente: { contains: String(q), mode: "insensitive" } }
      ];
      if (Number.isFinite(possibleMesa)) {
        where.OR.push({ mesa: possibleMesa });
      }
    }

    const sortMap = {
      "date-desc": { fecha: "desc" },
      "date-asc": { fecha: "asc" },
      "amount-desc": { total: "desc" },
      "amount-asc": { total: "asc" }
    };

    const ventas = await prisma.venta.findMany({
      where,
      include: ventaInclude,
      orderBy: sortMap[sort] || { fecha: "desc" },
      take: 500
    });

    res.json(ventas.map(mapVenta));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerVenta = async (req, res) => {
  try {
    const venta = await prisma.venta.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.user.empresaId
      },
      include: ventaInclude
    });

    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });
    res.json(mapVenta(venta));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarVenta = async (req, res) => {
  try {
    const actual = await prisma.venta.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.user.empresaId
      }
    });

    if (!actual) return res.status(404).json({ error: "Venta no encontrada" });

    const data = {};
    for (const field of ["numero", "cliente", "metodoPago", "estado"]) {
      if (typeof req.body?.[field] !== "undefined") data[field] = asString(req.body[field]);
    }
    for (const field of ["mesa", "subtotal", "iva", "propina", "total"]) {
      if (typeof req.body?.[field] !== "undefined") data[field] = asNumber(req.body[field], actual[field]);
    }

    if (typeof req.body?.productos !== "undefined") {
      const items = normalizeItems(req.body.productos);
      data.items = {
        deleteMany: {},
        create: items.map((item) => ({
          productoId: item.productoId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
          total: item.total
        }))
      };
    }

    const venta = await prisma.venta.update({
      where: { id: actual.id },
      data,
      include: ventaInclude
    });

    res.json(mapVenta(venta));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarVenta = async (req, res) => {
  try {
    const venta = await prisma.venta.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.user.empresaId
      }
    });

    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });

    await prisma.venta.delete({ where: { id: venta.id } });
    res.json({ mensaje: "Venta eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const limpiarVentas = async (req, res) => {
  try {
    const result = await prisma.venta.deleteMany({
      where: { empresaId: req.user.empresaId }
    });

    res.json({ mensaje: "Ventas eliminadas", eliminadas: result.count || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
