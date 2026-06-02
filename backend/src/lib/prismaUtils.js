import prisma from './prisma.js';

let defaultEmpresaPromise;

export const asNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const asString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

export const withId = (record) => {
  if (!record) return record;
  return {
    ...record,
    id: record.id
  };
};

export const decimalToNumber = (value) => {
  if (value === undefined || value === null) return value;
  return Number(value);
};

export const mapProducto = (producto) => {
  if (!producto) return producto;
  return withId({
    ...producto,
    precio: decimalToNumber(producto.precio)
  });
};

export const mapPedido = (pedido) => {
  if (!pedido) return pedido;
  return withId({
    ...pedido,
    mesa: pedido.mesa?.numero ?? pedido.mesa,
    mesero: pedido.mesero ?? pedido.meseroId,
    productos: Array.isArray(pedido.productos)
      ? pedido.productos.map((item) => withId({
          ...item,
          productoId: item.productoId,
          producto: item.producto ? mapProducto(item.producto) : item.producto,
          precio: decimalToNumber(item.precio)
        }))
      : [],
    total: decimalToNumber(pedido.total)
  });
};

export const mapVenta = (venta) => {
  if (!venta) return venta;
  return withId({
    ...venta,
    mesero: venta.mesero ?? venta.meseroId,
    productos: Array.isArray(venta.items)
      ? venta.items.map((item) => withId({
          ...item,
          productoId: item.productoId,
          producto: item.producto ? mapProducto(item.producto) : item.producto,
          precio: decimalToNumber(item.precio),
          total: decimalToNumber(item.total)
        }))
      : [],
    subtotal: decimalToNumber(venta.subtotal),
    iva: decimalToNumber(venta.iva),
    propina: decimalToNumber(venta.propina),
    total: decimalToNumber(venta.total)
  });
};

export const mapFacturaItem = (item) => {
  if (!item) return item;
  return withId({
    ...item,
    productoId: item.productoId,
    producto: item.producto ? mapProducto(item.producto) : item.producto,
    precio: decimalToNumber(item.precio),
    subtotal: decimalToNumber(item.subtotal),
    total: decimalToNumber(item.total),
    ivaPorcentaje: decimalToNumber(item.ivaPorcentaje)
  });
};

export const mapFactura = (factura) => {
  if (!factura) return factura;
  return withId({
    ...factura,
    mesero: factura.mesero ?? factura.meseroId,
    items: Array.isArray(factura.items)
      ? factura.items.map(mapFacturaItem)
      : [],
    subtotal: decimalToNumber(factura.subtotal),
    ivaTotal: decimalToNumber(factura.ivaTotal),
    propina: decimalToNumber(factura.propina),
    total: decimalToNumber(factura.total)
  });
};

export async function getDefaultEmpresa() {
  if (!defaultEmpresaPromise) {
    defaultEmpresaPromise = (async () => {
      const slug = asString(process.env.DEFAULT_EMPRESA_SLUG, 'default') || 'default';
      const nombre = asString(process.env.DEFAULT_EMPRESA_NAME, 'TenPos') || 'TenPos';

      const existente = await prisma.empresa.findFirst({ where: { slug } });
      if (existente) {
        return existente;
      }

      return prisma.empresa.create({
        data: {
          nombre,
          slug,
          activo: true
        }
      });
    })();
  }

  return defaultEmpresaPromise;
}

export async function getDefaultEmpresaId() {
  const empresa = await getDefaultEmpresa();
  return empresa.id;
}

export async function ensureMesa(numero, defaults = {}) {
  const empresaId = await getDefaultEmpresaId();
  const mesaNumero = asNumber(numero, NaN);

  if (!Number.isFinite(mesaNumero)) {
    return null;
  }

  const existente = await prisma.mesa.findFirst({
    where: {
      empresaId,
      numero: mesaNumero
    }
  });

  if (existente) {
    return existente;
  }

  return prisma.mesa.create({
    data: {
      empresaId,
      numero: mesaNumero,
      capacidad: asNumber(defaults.capacidad, 4),
      estado: asString(defaults.estado, 'disponible') || 'disponible'
    }
  });
}

export async function findMesaByNumero(numero) {
  const empresaId = await getDefaultEmpresaId();
  const mesaNumero = asNumber(numero, NaN);

  if (!Number.isFinite(mesaNumero)) {
    return null;
  }

  return prisma.mesa.findFirst({
    where: {
      empresaId,
      numero: mesaNumero
    }
  });
}
