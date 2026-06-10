import prisma from "../lib/prisma.js";
import {
  asNumber,
  asString,
  mapPedido,
  mapProducto
} from "../lib/prismaUtils.js";

const pedidoItemSelect = {
  id: true,
  productoId: true,
  nombre: true,
  precio: true,
  cantidad: true
};

const pedidoListSelect = {
  id: true,
  empresaId: true,
  mesaId: true,
  meseroId: true,
  responsable: true,
  total: true,
  estado: true,
  fecha: true,
  mesa: { select: { numero: true } },
  productos: { select: pedidoItemSelect }
};

const pedidoDetailInclude = {
  mesa: { select: { id: true, numero: true, estado: true } },
  mesero: { select: { id: true, nombre: true, username: true } },
  productos: { select: pedidoItemSelect }
};

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const resolveMesaId = (payload) =>
  asString(payload.mesaId || payload.mesa_id, "") || null;

const parseBoolQuery = (value) =>
  value === "1" || value === "true" || value === true;

const buildPedidosWhere = (empresaId, query = {}) => {
  const where = { empresaId };

  const mesaNumero = asNumber(query.mesa, NaN);
  if (Number.isFinite(mesaNumero)) {
    where.mesa = { numero: mesaNumero };
  }

  if (parseBoolQuery(query.activo)) {
    where.estado = { not: "entregado" };
  }

  return where;
};

const releaseMesaIfIdle = async (tx, empresaId, mesaId) => {
  const active = await tx.pedido.count({
    where: {
      empresaId,
      mesaId,
      estado: { not: "entregado" }
    }
  });

  if (active === 0) {
    await tx.mesa.update({
      where: { id: mesaId },
      data: { estado: "disponible" }
    });
  }
};

const readItems = (productos) =>
  Array.isArray(productos) ? productos : [];

const normalizeItems = (productos) =>
  readItems(productos).map((item) => ({
    productoId: asString(item?.productoId, "") || null,
    nombre: asString(item?.nombre, "Producto") || "Producto",
    precio: asNumber(item?.precio, 0),
    cantidad: Math.max(1, asNumber(item?.cantidad, 1))
  }));

const resolveMesaInTx = async (tx, empresaId, payload) => {
  const mesaId = resolveMesaId(payload);
  if (mesaId) {
    return tx.mesa.findFirst({
      where: { id: mesaId, empresaId },
      select: { id: true, numero: true }
    });
  }

  const mesaNumero = asNumber(payload.mesa, NaN);
  if (!Number.isFinite(mesaNumero)) return null;

  let mesa = await tx.mesa.findFirst({
    where: { empresaId, numero: mesaNumero },
    select: { id: true, numero: true }
  });

  if (!mesa) {
    mesa = await tx.mesa.create({
      data: {
        empresaId,
        numero: mesaNumero,
        capacidad: 4,
        estado: "disponible"
      },
      select: { id: true, numero: true }
    });
  }

  return mesa;
};

// ==========================================
// 🔥 FUNCIÓN: VALIDADOR INTEGRAL DE INVENTARIO
// ==========================================
const verificarDisponibilidadInventario = async (tx, empresaId, items) => {
  const productIds = [...new Set(items.map((i) => i.productoId).filter(Boolean))];
  if (!productIds.length) return [];

  // 1. Consultar productos y sus respectivas recetas con materias primas
  const productosDb = await tx.product.findMany({
    where: { empresaId, id: { in: productIds } },
    include: {
      recetas: {
        include: { materiaPrima: true }
      }
    }
  });

  const mapaProductos = new Map(productosDb.map((p) => [p.id, p]));
  const requerimientosMateriasPrimas = {};
  const errores = [];

  // Mapeamos las cantidades que el cliente está pidiendo en total
  const cantidadesPedidas = {};
  items.forEach(item => {
    if (item.productoId) {
      cantidadesPedidas[item.productoId] = (cantidadesPedidas[item.productoId] || 0) + item.cantidad;
    }
  });

  // 2. Calcular necesidades tanto de stock directo como de sub-recetas
  for (const [productoId, cantidadRequerida] of Object.entries(cantidadesPedidas)) {
    const producto = mapaProductos.get(productoId);

    if (!producto || !producto.disponible) {
      errores.push(`El producto "${producto?.nombre || 'Desconocido'}" no está disponible para la venta.`);
      continue;
    }

    // Validación A: Validar stock directo si el producto lo maneja de esa forma
    if (producto.stock < cantidadRequerida) {
      errores.push(`Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock}, Solicitado: ${cantidadRequerida}`);
    }

    // Validación B: Acumular materias primas necesarias según recetas
    if (producto.recetas && producto.recetas.length > 0) {
      producto.recetas.forEach((receta) => {
        const mpId = receta.materiaPrimaId;
        // cantidad necesaria de materia prima = cantidad de receta * platos solicitados
        const totalNecesarioMP = Number(receta.cantidad) * cantidadRequerida;

        if (!requerimientosMateriasPrimas[mpId]) {
          requerimientosMateriasPrimas[mpId] = {
            nombre: receta.materiaPrima.nombre,
            disponibleDb: receta.materiaPrima.stock,
            acumuladoRequerido: 0
          };
        }
        requerimientosMateriasPrimas[mpId].acumuladoRequerido += totalNecesarioMP;
      });
    }
  }

  // 3. Evaluar si las materias primas consolidadas aguantan la orden entera
  Object.entries(requerimientosMateriasPrimas).forEach(([mpId, info]) => {
    if (info.disponibleDb < info.acumuladoRequerido) {
      errores.push(`Falta materia prima: "${info.nombre}". En cocina: ${info.disponibleDb}, Requerido para la orden: ${info.acumuladoRequerido}`);
    }
  });

  return errores;
};

// ==========================================
// 🔥 FUNCIÓN: DESCUENTO DE INVENTARIO EN CASCADA
// ==========================================
const ejecutarDescuentoInventario = async (tx, empresaId, items) => {
  const productIds = [...new Set(items.map((i) => i.productoId).filter(Boolean))];
  if (!productIds.length) return;

  const productosDb = await tx.product.findMany({
    where: { empresaId, id: { in: productIds } },
    include: { recetas: true }
  });

  const mapaProductos = new Map(productosDb.map((p) => [p.id, p]));

  for (const item of items) {
    if (!item.productoId) continue;
    const producto = mapaProductos.get(item.productoId);
    if (!producto) continue;

    // 1. Restar stock directo del Producto terminado
    await tx.product.update({
      where: { id: item.productoId, empresaId },
      data: { stock: { decrement: item.cantidad } }
    });

    // 2. Restar stock de las Materias Primas ligadas a su receta
    if (producto.recetas && producto.recetas.length > 0) {
      await Promise.all(
        producto.recetas.map((receta) => {
          const descuentoMP = Number(receta.cantidad) * item.cantidad;
          return tx.materiaPrima.update({
            where: { id: receta.materiaPrimaId, empresaId },
            data: { stock: { decrement: Math.ceil(descuentoMP) } }
          });
        })
      );
    }
  }
};

// =======================
// 🚀 CREAR PEDIDO (Con Validación de Stock e Ingredientes)
// =======================
export const crearPedido = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const payload = req.body || {};

    const items = normalizeItems(payload.productos);
    const total = asNumber(payload.total, NaN);

    if (!items.length) {
      return res.status(400).json({ error: "Productos requeridos" });
    }

    if (!Number.isFinite(total)) {
      return res.status(400).json({ error: "Total requerido" });
    }

    const meseroId = asString(payload.mesero || payload.meseroId) || req.user.id || null;
    const responsable = asString(payload.responsable, "Sin asignar") || "Sin asignar";
    const estado = asString(payload.estado, "pendiente");

    const pedido = await prisma.$transaction(async (tx) => {
      // VALIDACIÓN INICIAL DE INVENTARIO
      const erroresInventario = await verificarDisponibilidadInventario(tx, empresaId, items);
      if (erroresInventario.length > 0) {
        const error = new Error("Inventario Insuficiente");
        error.status = 409;
        error.items = erroresInventario;
        throw error;
      }

      const mesa = await resolveMesaInTx(tx, empresaId, payload);
      if (!mesa) {
        const error = new Error("Mesa requerida");
        error.status = 400;
        throw error;
      }

      const created = await tx.pedido.create({
        data: {
          empresaId,
          mesaId: mesa.id,
          meseroId,
          responsable,
          total,
          estado,
          productos: { create: items }
        },
        select: pedidoListSelect
      });

      await tx.mesa.update({
        where: { id: mesa.id },
        data: { estado: "ocupada" }
      });

      return created;
    });

    return res.status(201).json(mapPedido(pedido));
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.status === 409) {
      return res.status(409).json({
        error: error.message,
        detalles: error.items // Enviamos los strings limpios con los faltantes exactos
      });
    }
    return res.status(500).json({ error: error.message });
  }
};

// =======================
// 📦 OBTENER TODOS
// =======================
export const obtenerPedidos = async (req, res) => {
  try {
    const limit = asNumber(req.query?.limit, NaN);
    const where = buildPedidosWhere(req.user.empresaId, req.query);

    if (parseBoolQuery(req.query?.hoy)) {
      where.fecha = { gte: getStartOfToday() };
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      select: pedidoListSelect,
      orderBy: { fecha: "desc" },
      ...(Number.isFinite(limit) && limit > 0 ? { take: limit } : {})
    });

    res.json(pedidos.map(mapPedido));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =======================
// 📦 CONTEXTO INICIAL
// =======================
export const obtenerPedidosContext = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const startOfToday = getStartOfToday();

    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId,
        fecha: { gte: startOfToday }
      },
      select: pedidoListSelect,
      orderBy: { fecha: "desc" },
      take: 200
    });

    const [mesas, productos] = await Promise.all([
      prisma.mesa.findMany({
        where: { empresaId },
        select: {
          id: true,
          numero: true,
          capacidad: true,
          estado: true
        },
        orderBy: { numero: "asc" }
      }),
      prisma.product.findMany({
        where: { empresaId, disponible: true },
        select: {
          id: true,
          nombre: true,
          precio: true,
          categoria: true,
          disponible: true
        },
        orderBy: { nombre: "asc" }
      })
    ]);

    res.json({
      pedidos: pedidos.map(mapPedido),
      mesas,
      productos: productos.map(mapProducto)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =======================
// 🔍 OBTENER UNO
// =======================
export const obtenerPedido = async (req, res) => {
  try {
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.user.empresaId
      },
      include: pedidoDetailInclude
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    res.json(mapPedido(pedido));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =======================
// ✏️ ACTUALIZAR PEDIDO (Descuento físico al cambiar a "entregado")
// =======================
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

    if (!actual) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const nextEstado = asString(req.body?.estado, actual.estado);
    const prevEstado = asString(actual.estado);
    const replaceItems = Array.isArray(req.body?.productos);

    const items = replaceItems
      ? normalizeItems(req.body.productos)
      : actual.productos;

    const pedido = await prisma.$transaction(async (tx) => {
      // Si pasa a estado "entregado", validamos y descontamos materias primas + producto
      if (prevEstado !== "entregado" && nextEstado === "entregado") {
        const erroresInventario = await verificarDisponibilidadInventario(tx, empresaId, items);

        if (erroresInventario.length > 0) {
          const error = new Error("Inventario Insuficiente al despachar");
          error.status = 409;
          error.items = erroresInventario;
          throw error;
        }

        // Ejecuta el descuento doble: stock de producto y stock de ingredientes
        await ejecutarDescuentoInventario(tx, empresaId, items);
      }

      const updated = await tx.pedido.update({
        where: { id: actual.id },
        data: {
          responsable: asString(req.body?.responsable, actual.responsable) || "Sin asignar",
          estado: nextEstado,
          total: typeof req.body?.total !== "undefined" ? asNumber(req.body.total, actual.total) : actual.total,
          ...(replaceItems && {
            productos: {
              deleteMany: {},
              create: items
            }
          })
        },
        select: pedidoListSelect
      });

      if (nextEstado === "entregado") {
        await releaseMesaIfIdle(tx, empresaId, actual.mesaId);
      }

      return updated;
    });

    res.json(mapPedido(pedido));
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({
        error: error.message,
        detalles: error.items
      });
    }

    res.status(500).json({ error: error.message });
  }
};

// =======================
// 🗑 ELIMINAR
// =======================
export const eliminarPedido = async (req, res) => {
  try {
    const empresaId = req.user.empresaId;

    const pedido = await prisma.pedido.findFirst({
      where: {
        id: req.params.id,
        empresaId
      },
      select: { id: true, mesaId: true }
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pedido.delete({ where: { id: pedido.id } });
      await releaseMesaIfIdle(tx, empresaId, pedido.mesaId);
    });

    res.json({ mensaje: "Pedido eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};