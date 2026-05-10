import Venta from "../models/venta.model.js";

const VAT_RATE = 0.19;

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

export const crearVenta = async (req, res) => {
  try {
    const payload = req.body || {};
    const numero = payload.numero || buildSaleNumber();
    const total = Number(payload.total || 0);
    if (!total) {
      return res.status(400).json({ error: "El total es obligatorio" });
    }

    const totals = payload.subtotal != null && payload.iva != null
      ? { subtotal: Number(payload.subtotal), iva: Number(payload.iva) }
      : computeTotalsFromTotal(total, VAT_RATE);

    const venta = new Venta({
      ...payload,
      numero,
      total,
      subtotal: totals.subtotal,
      iva: totals.iva,
      estado: payload.estado || "completada"
    });

    await venta.save();

    res.status(201).json(venta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerVentas = async (req, res) => {
  try {
    const { from, to, status, q, sort } = req.query || {};
    const filters = {};

    if (status && status !== "all") {
      filters.estado = status;
    }

    if (from || to) {
      filters.fecha = {};
      if (from) filters.fecha.$gte = new Date(from);
      if (to) filters.fecha.$lte = new Date(to);
    }

    if (q) {
      const regex = new RegExp(String(q), "i");
      const possibleMesa = Number(q);
      filters.$or = [
        { numero: regex },
        { cliente: regex }
      ];
      if (Number.isFinite(possibleMesa)) {
        filters.$or.push({ mesa: possibleMesa });
      }
    }

    const sortMap = {
      "date-desc": { fecha: -1 },
      "date-asc": { fecha: 1 },
      "amount-desc": { total: -1 },
      "amount-asc": { total: 1 }
    };

    const sortValue = sortMap[sort] || { fecha: -1 };

    const ventas = await Venta.find(filters)
      .populate('mesero')
      .populate('productos.productoId')
      .sort(sortValue)
      .limit(500);

    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('mesero')
      .populate('productos.productoId');
    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarVenta = async (req, res) => {
  try {
    const venta = await Venta.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarVenta = async (req, res) => {
  try {
    await Venta.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Venta eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const limpiarVentas = async (req, res) => {
  try {
    const result = await Venta.deleteMany({});
    res.json({ mensaje: "Ventas eliminadas", eliminadas: result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
