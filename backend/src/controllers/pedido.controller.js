import prisma from "../lib/prisma.js";
import { asNumber, asString, mapPedido } from "../lib/prismaUtils.js";

const pedidoInclude = {
  mesa: true,
  mesero: true,
  productos: {
    include: { producto: true }
  }
};

const readItems = (productos) => Array.isArray(productos) ? productos : [];

const normalizeItems = (productos) => readItems(productos).map((item) => ({
  productoId: asString(item?.productoId, "") || null,
  nombre: asString(item?.nombre, "Producto") || "Producto",
  precio: asNumber(item?.precio, 0),
  cantidad: Math.max(1, asNumber(item?.cantidad, 1))
}));

const getMesaForPayload = async (empresaId, payload) => {
  const mesaId = asString(payload.mesaId || payload.mesa);
  const mesaNumero = asNumber(payload.mesa, NaN);

  if (mesaId && !Number.isFinite(mesaNumero)) {
    return prisma.mesa.findFirst({
      where: {
        empresaId,
        id: mesaId
      }
    });
  }

  if (!Number.isFinite(mesaNumero)) return null;

  const existente = await prisma.mesa.findFirst({
    where: {
      empresaId,
      numero: mesaNumero
    }
  });

  if (existente) return existente;

  return prisma.mesa.create({
    data: {
      empresaId,
      numero: mesaNumero,
      capacidad: 4,
      estado: "disponible"
    }
  });
};

const validateStock = async (tx, empresaId, items) => {
  const productIds = [...new Set(items.map((item) => item.productoId).filter(Boolean))];
  if (!productIds.length) return [];

  const products = await tx.product.findMany({
    where: {
      empresaId,
      id: { in: productIds }
    },
    select: {
      id: true,
      nombre: true,
      stock: true,
      disponible: true
    }
  });

  const stockById = new Map(products.map((product) => [product.id, product]));
  return items.reduce((insufficient, item) => {
    if (!item.productoId) return insufficient;

    const product = stockById.get(item.productoId);
    if (!product || product.disponible === false || product.stock < item.cantidad) {
      insufficient.push({
        productoId: item.productoId,
        nombre: product?.nombre || item.nombre || "Producto",
        stock: product?.stock ?? 0,
        disponible: product?.disponible ?? false,
        requerido: item.cantidad
      });
    }

    return insufficient;
  }, []);
};

const discountStock = async (tx, empresaId, items) => {
  for (const item of items) {
    if (!item.productoId) continue;
    await tx.product.update({
      where: {
        id: item.productoId,
        empresaId
      },
      data: {
        stock: {
          decrement: item.cantidad
        }
      }
    });
  }
};

export const crearPedido = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const payload = req.body || {};
    const mesa = await getMesaForPayload(empresaId, payload);
    const items = normalizeItems(payload.productos);
    const total = asNumber(payload.total, NaN);

    if (!mesa) return res.status(400).json({ error: "Mesa requerida" });
    if (!Number.isFinite(total)) return res.status(400).json({ error: "Total requerido" });

    const pedido = await prisma.$transaction(async (tx) => {
      const insufficient = await validateStock(tx, empresaId, items);
      if (insufficient.length) {
        const error = new Error("Producto no disponible o stock insuficiente para crear el pedido");
        error.status = 409;
        error.items = insufficient;
        throw error;
      }

      const created = await tx.pedido.create({
        data: {
          empresaId,
          mesaId: mesa.id,
          meseroId: asString(payload.mesero || payload.meseroId) || req.user.id || null,
          responsable: asString(payload.responsable, "Sin asignar") || "Sin asignar",
          total,
          estado: asString(payload.estado, "pendiente") || "pendiente",
          productos: {
            create: items.map((item) => ({
              productoId: item.productoId,
              nombre: item.nombre,
              precio: item.precio,
              cantidad: item.cantidad
            }))
          }
        },
        include: pedidoInclude
      });

      await tx.mesa.update({
        where: { id: mesa.id },
        data: { estado: "ocupada" }
      });

      return created;
    });

    res.status(201).json(mapPedido(pedido));
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message, items: error.items });
    }
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPedidos = async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { empresaId: req.user.empresaId },
      include: pedidoInclude,
      orderBy: { fecha: "desc" }
    });

    res.json(pedidos.map(mapPedido));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerPedido = async (req, res) => {
  try {
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.user.empresaId
      },
      include: pedidoInclude
    });

    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
    res.json(mapPedido(pedido));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const actualizarPedido = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const actual = await prisma.pedido.findFirst({
      where: {
        id: req.params.id,
        empresaId
      },
      include: { productos: true, mesa: true }
    });

    if (!actual) return res.status(404).json({ error: "Pedido no encontrado" });

    const nextEstado = asString(req.body?.estado, actual.estado).toLowerCase();
    const prevEstado = asString(actual.estado).toLowerCase();
    const replaceItems = Array.isArray(req.body?.productos);
    const items = replaceItems ? normalizeItems(req.body.productos) : actual.productos;

    const pedido = await prisma.$transaction(async (tx) => {
      if (prevEstado !== "entregado" && nextEstado === "entregado") {
        const insufficient = await validateStock(tx, empresaId, items);
        if (insufficient.length) {
          const error = new Error("Stock insuficiente para completar el pedido");
          error.status = 409;
          error.items = insufficient;
          throw error;
        }
        await discountStock(tx, empresaId, items);
      }

      const data = {
        responsable: asString(req.body?.responsable, actual.responsable) || "Sin asignar",
        estado: nextEstado,
        total: typeof req.body?.total !== "undefined" ? asNumber(req.body.total, actual.total) : actual.total
      };

      if (replaceItems) {
        data.productos = {
          deleteMany: {},
          create: items.map((item) => ({
            productoId: item.productoId,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.cantidad
          }))
        };
      }

      const updated = await tx.pedido.update({
        where: { id: actual.id },
        data,
        include: pedidoInclude
      });

      if (nextEstado === "entregado") {
        const active = await tx.pedido.count({
          where: {
            empresaId,
            mesaId: actual.mesaId,
            estado: { not: "entregado" }
          }
        });
        if (active === 0) {
          await tx.mesa.update({
            where: { id: actual.mesaId },
            data: { estado: "disponible" }
          });
        }
      }

      return updated;
    });

    res.json(mapPedido(pedido));
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message, items: error.items });
    }
    res.status(500).json({ error: error.message });
  }
};

export const eliminarPedido = async (req, res) => {
  try {
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.user.empresaId
      }
    });

    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });

    await prisma.pedido.delete({ where: { id: pedido.id } });

    res.json({ mensaje: "Pedido eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
