import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import authService from '../services/api';
import PageHeader from '../components/PageHeader';
import { UxConfirm, UxToast } from '../components/UXFeedback';
import '../styles/pedido.css';

const STATUS_SEQUENCE = ['pendiente', 'preparando', 'listo', 'entregado'];
const STATUS_LABEL = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  listo: 'Listo',
  entregado: 'Entregado'
};

const toCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('es-CO')}`;
const taxFromSubtotal = (subtotal) => Math.round(Number(subtotal || 0) * 0.16);
const getTime = (dateValue) => {
  const date = new Date(dateValue || Date.now());
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const categoryEmoji = {
  comida: '🍛',
  bebidas: '🥤',
  bebida: '🥤',
  entradas: '🥟',
  postres: '🍰',
  postre: '🍰',
  otro: '🍽️'
};

const getDefaultResponsable = () => {
  try {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    return user?.nombre || user?.username || 'Sin asignar';
  } catch {
    return 'Sin asignar';
  }
};

export default function PedidosPage() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [view, setView] = useState('list');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [obsOpen, setObsOpen] = useState({});
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mesaFormValue, setMesaFormValue] = useState('');
  const [responsableFormValue, setResponsableFormValue] = useState('');
  const [notice, setNotice] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  const openConfirm = ({
    title,
    message,
    confirmLabel = 'Confirmar',
    confirmType = 'primary',
    onConfirm
  }) => {
    setConfirmState({ title, message, confirmLabel, confirmType, onConfirm });
  };

  const closeConfirm = () => setConfirmState(null);

  const handleConfirmAccept = async () => {
    if (!confirmState?.onConfirm) {
      closeConfirm();
      return;
    }

    try {
      await confirmState.onConfirm();
    } finally {
      closeConfirm();
    }
  };

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(String(p._id), p));
    return map;
  }, [products]);

  const normalizedOrders = useMemo(() => {
    return orders.map((o) => {
      const items = Array.isArray(o.productos)
        ? o.productos.map((item) => {
            const productId = item?.productoId?._id || item?.productoId || null;
            const realProduct = productById.get(String(productId || ''));
            const category = (realProduct?.categoria || '').toLowerCase();
            const name = item?.nombre || realProduct?.nombre || 'Producto';
            const price = Number(item?.precio ?? realProduct?.precio ?? 0);
            const qty = Number(item?.cantidad ?? 1);
            const obs = item?.obs || '';
            return {
              productId: productId ? String(productId) : null,
              name,
              price,
              qty,
              obs,
              cat: realProduct?.categoria || 'otro',
              emoji: categoryEmoji[category] || categoryEmoji.otro
            };
          })
        : [];

      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const total = Number(o.total ?? (subtotal + taxFromSubtotal(subtotal)));

      return {
        _id: o._id,
        id: `#${String(o._id || '').slice(-4).toUpperCase()}`,
        mesaNumero: Number(o.mesa),
        table: `Mesa ${o.mesa}`,
        resp: o?.mesero?.nombre || o?.mesero?.username || o?.responsable || 'Sin asignar',
        status: o.estado,
        time: getTime(o.fecha),
        fecha: o.fecha,
        items,
        subtotal,
        tax: taxFromSubtotal(subtotal),
        total
      };
    });
  }, [orders, productById]);

  const selectedOrder = useMemo(
    () => normalizedOrders.find((o) => o._id === selectedOrderId) || null,
    [normalizedOrders, selectedOrderId]
  );

  const filteredOrders = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return normalizedOrders.filter((o) => {
      const byStatus = currentFilter === 'all' || o.status === currentFilter;
      const bySearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.table.toLowerCase().includes(q) ||
        o.resp.toLowerCase().includes(q);
      return byStatus && bySearch;
    });
  }, [normalizedOrders, currentFilter, searchText]);

  const stats = useMemo(() => {
    return {
      total: normalizedOrders.length,
      pendiente: normalizedOrders.filter((o) => o.status === 'pendiente').length,
      preparando: normalizedOrders.filter((o) => o.status === 'preparando').length,
      done: normalizedOrders.filter((o) => ['listo', 'entregado'].includes(o.status)).length
    };
  }, [normalizedOrders]);

  const categories = useMemo(() => {
    return ['Todos', ...new Set(products.map((p) => p.categoria || 'otro'))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const categoryOk = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const searchOk = !q || String(p.nombre || '').toLowerCase().includes(q);
      return categoryOk && searchOk;
    });
  }, [products, selectedCategory, productSearch]);

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 0), 0),
    [cart]
  );
  const cartTax = useMemo(() => taxFromSubtotal(cartSubtotal), [cartSubtotal]);
  const cartTotal = useMemo(() => cartSubtotal + cartTax, [cartSubtotal, cartTax]);

  const loadAll = async () => {
    try {
      const [pedidosData, mesasData, productosData] = await Promise.all([
        authService.getPedidos(),
        authService.getMesas(),
        authService.getProducts()
      ]);
      setOrders(Array.isArray(pedidosData) ? pedidosData : []);
      setMesas(Array.isArray(mesasData) ? mesasData : []);
      setProducts(Array.isArray(productosData) ? productosData : []);
    } catch (error) {
      console.error('Error cargando datos de pedidos:', error);
      pushNotice('No se pudieron cargar pedidos, productos y mesas.', 'error');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setResponsableFormValue(getDefaultResponsable());
  }, []);

  const goCreate = (order = null) => {
    if (order) {
      setEditingOrderId(order._id);
      setMesaFormValue(String(order.mesaNumero));
      const currentDefault = getDefaultResponsable();
      setResponsableFormValue(
        order.resp && order.resp !== 'Sin asignar'
          ? order.resp
          : currentDefault
      );
      setCart(order.items.map((i) => ({ ...i })));
      setObsOpen({});
    } else {
      const firstMesa = mesas[0]?.numero;
      setEditingOrderId(null);
      setMesaFormValue(firstMesa ? String(firstMesa) : '');
      setResponsableFormValue(getDefaultResponsable());
      setCart([]);
      setObsOpen({});
    }
    setSelectedCategory('Todos');
    setProductSearch('');
    setView('create');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mesaParam = params.get('mesa');
    const modeParam = params.get('mode');

    if (!mesaParam || !modeParam) return;
    if (!mesas.length) return;

    const mesaNumero = Number(mesaParam);
    if (Number.isNaN(mesaNumero)) return;

    if (modeParam === 'create') {
      setEditingOrderId(null);
      setMesaFormValue(String(mesaNumero));
      setResponsableFormValue(getDefaultResponsable());
      setCart([]);
      setObsOpen({});
      setSelectedCategory('Todos');
      setProductSearch('');
      setView('create');
      return;
    }

    if (modeParam === 'edit') {
      const candidates = normalizedOrders
        .filter((o) => o.mesaNumero === mesaNumero && o.status !== 'entregado')
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      if (candidates.length) {
        goCreate(candidates[0]);
      } else {
        setMesaFormValue(String(mesaNumero));
        setCart([]);
        setView('create');
        pushNotice('No se encontro un pedido activo para esta mesa. Puedes crear uno nuevo.', 'info');
      }
    }
  }, [location.search, mesas.length, normalizedOrders]);

  const goList = () => {
    setView('list');
    setEditingOrderId(null);
    setObsOpen({});
  };

  const addCart = (product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === String(product._id));
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      const cat = (product.categoria || 'otro').toLowerCase();
      return [
        ...prev,
        {
          productId: String(product._id),
          name: product.nombre,
          price: Number(product.precio || 0),
          qty: 1,
          obs: '',
          cat: product.categoria || 'otro',
          emoji: categoryEmoji[cat] || categoryEmoji.otro
        }
      ];
    });
  };

  const changeQty = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], qty: updated[index].qty + delta };
      if (updated[index].qty <= 0) updated.splice(index, 1);
      return updated;
    });
  };

  const removeCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleObs = (index) => {
    setObsOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const updateObs = (index, value) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], obs: value };
      return updated;
    });
  };

  const getMesaByNumero = (numero) => mesas.find((m) => Number(m.numero) === Number(numero));

  const updateMesaState = async (mesaNumero, estado) => {
    const mesa = getMesaByNumero(mesaNumero);
    if (!mesa) return;
    await authService.actualizarMesa(mesa._id, { estado });
  };

  const saveOrder = async () => {
    if (!mesaFormValue) {
      pushNotice('Selecciona una mesa antes de confirmar el pedido.', 'warning');
      return;
    }
    if (!cart.length) {
      pushNotice('Agrega al menos un producto para crear el pedido.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        mesa: Number(mesaFormValue),
        responsable: (responsableFormValue || '').trim() || getDefaultResponsable(),
        estado: editingOrderId ? normalizedOrders.find((o) => o._id === editingOrderId)?.status || 'pendiente' : 'pendiente',
        productos: cart.map((i) => ({
          productoId: i.productId,
          nombre: i.name,
          precio: Number(i.price || 0),
          cantidad: Number(i.qty || 1),
          obs: i.obs || ''
        })),
        total: cartTotal
      };

      if (editingOrderId) {
        await authService.actualizarPedido(editingOrderId, payload);
      } else {
        await authService.crearPedido(payload);
      }

      if (payload.estado === 'entregado') {
        await updateMesaState(payload.mesa, 'disponible');
      } else {
        await updateMesaState(payload.mesa, 'ocupada');
      }

      await loadAll();
      goList();
      setSelectedOrderId(null);
      pushNotice(editingOrderId ? 'Pedido actualizado correctamente.' : 'Pedido creado correctamente.', 'success');
    } catch (error) {
      console.error('Error guardando pedido:', error);
      pushNotice(error?.response?.data?.error || 'No se pudo guardar el pedido.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (order) => {
    openConfirm({
      title: 'Eliminar pedido',
      message: `El pedido ${order.id} se eliminara de forma permanente.`,
      confirmLabel: 'Eliminar pedido',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await authService.eliminarPedido(order._id);
          await updateMesaState(order.mesaNumero, 'disponible');
          await loadAll();
          setSelectedOrderId(null);
          pushNotice('Pedido eliminado correctamente.', 'success');
        } catch (error) {
          console.error('Error eliminando pedido:', error);
          pushNotice('No se pudo eliminar el pedido.', 'error');
        }
      }
    });
  };

  const advanceStatus = async (order) => {
    try {
      const idx = STATUS_SEQUENCE.indexOf(order.status);
      const nextStatus = STATUS_SEQUENCE[Math.min(idx + 1, STATUS_SEQUENCE.length - 1)];
      await authService.actualizarPedido(order._id, { estado: nextStatus });
      if (nextStatus === 'entregado') {
        await updateMesaState(order.mesaNumero, 'disponible');
      }
      await loadAll();
      setSelectedOrderId(order._id);
      pushNotice(`Pedido ${order.id} actualizado a ${STATUS_LABEL[nextStatus]}.`, 'success');
    } catch (error) {
      console.error('Error avanzando estado:', error);
      pushNotice('No se pudo actualizar el estado del pedido.', 'error');
    }
  };

  return (
    <div className="pedidos-v3 app">
      <UxToast notice={notice} onClose={() => setNotice(null)} />
      <UxConfirm state={confirmState} onCancel={closeConfirm} onConfirm={handleConfirmAccept} />

      <PageHeader
        label="Gestion de pedidos"
        title={view === 'list' ? 'Gestion de pedidos' : editingOrderId ? 'Editar pedido' : 'Nuevo pedido'}
        subtitle={view === 'list' ? `${stats.total} pedidos registrados hoy` : ''}
        iconColor="#3b3b7d"
        icon={(
          <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
            <rect x="4" y="3" width="12" height="14" rx="2" />
            <path d="M7 7h6M7 10h4" />
          </svg>
        )}
        actions={
          view === 'list' ? (
            <>
              <button className="btn-outline" type="button">Exportar</button>
              <div className="ph-divider"></div>
              <button className="btn-solid" id="new-btn" type="button" onClick={() => goCreate()}>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
                Nuevo pedido
              </button>
            </>
          ) : null
        }
      />

      <div className="content">
        {view === 'list' && (
          <div className="list-view" id="view-list">
            <div className={`list-panel ${selectedOrder ? 'shrunk' : ''}`} id="list-panel">
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#eef2ff' }}><svg viewBox="0 0 16 16" fill="none" stroke="#4f46e5" strokeWidth="1.6"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M6 6h4M6 9h3"/></svg></div>
                  <div><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total hoy</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fffbeb' }}><svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 2"/></svg></div>
                  <div><div className="stat-num">{stats.pendiente}</div><div className="stat-lbl">Pendientes</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#eef2ff' }}><svg viewBox="0 0 16 16" fill="none" stroke="#6366f1" strokeWidth="1.6"><path d="M3 8h10M8.5 4l3.5 4-3.5 4"/></svg></div>
                  <div><div className="stat-num">{stats.preparando}</div><div className="stat-lbl">En cocina</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f0fdf4' }}><svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7"/></svg></div>
                  <div><div className="stat-num">{stats.done}</div><div className="stat-lbl">Completados</div></div>
                </div>
              </div>

              <div className="toolbar">
                <div className="search-box">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="m11 11 2.5 2.5"/></svg>
                  <input
                    type="text"
                    placeholder="Buscar por mesa, responsable, #pedido..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  {['all', 'pendiente', 'preparando', 'listo', 'entregado'].map((f) => (
                    <button
                      key={f}
                      className={`fchip ${currentFilter === f ? 'on' : ''}`}
                      type="button"
                      onClick={() => setCurrentFilter(f)}
                    >
                      <span
                        className="fchip-dot"
                        style={{
                          background:
                            f === 'all'
                              ? '#c7d2fe'
                              : f === 'pendiente'
                              ? '#f59e0b'
                              : f === 'preparando'
                              ? '#6366f1'
                              : f === 'listo'
                              ? '#10b981'
                              : '#cbd5e1'
                        }}
                      ></span>
                      {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="orders-scroller">
                {!filteredOrders.length ? (
                  <div className="empty-orders">
                    <div className="ei"><svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="1.5"/><path d="M6 6h4M6 9h3"/></svg></div>
                    <div className="et">Sin resultados</div>
                    <div className="es">Ajusta el filtro o la búsqueda</div>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
                    const itemNames = `${order.items.slice(0, 2).map((i) => i.name).join(', ')}${order.items.length > 2 ? ` +${order.items.length - 2} más` : ''}`;
                    return (
                      <div
                        key={order._id}
                        className={`order-card ${selectedOrderId === order._id ? 'sel' : ''}`}
                        onClick={() => setSelectedOrderId(order._id)}
                      >
                        <div className={`card-stripe stripe-${order.status}`}></div>
                        <div className="card-inner">
                          <div className="card-left">
                            <span className={`oid-tag oid-${order.status}`}>{order.id}</span>
                            <span className="card-time">{order.time}</span>
                          </div>
                          <div className="card-mid">
                            <div className="card-title-row">
                              <span className="card-mesa">{order.table}</span>
                              <span className="card-resp">{order.resp}</span>
                            </div>
                            <div className="card-items-txt">{itemCount} items · {itemNames}</div>
                          </div>
                          <div className="card-right">
                            <span className={`status-pill sp-${order.status}`}>{STATUS_LABEL[order.status]}</span>
                            <span className="card-total">{toCurrency(order.total)}</span>
                            <span className="card-arrow"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4l4 4-4 4"/></svg></span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={`preview-panel ${selectedOrder ? 'open' : ''}`}>
              {selectedOrder && (
                <div className="prev-inner">
                  <div className="prev-head">
                    <div className="prev-toprow">
                      <span className="prev-oid">{selectedOrder.id}</span>
                      <button className="prev-close" type="button" onClick={() => setSelectedOrderId(null)}>×</button>
                    </div>
                    <div className="prev-title">{selectedOrder.table}</div>
                    <div className="prev-meta">
                      <span>{selectedOrder.resp}</span>
                      <span style={{ color: '#c7d2fe' }}>·</span>
                      <span>{selectedOrder.time}</span>
                      <span className={`status-pill sp-${selectedOrder.status}`} style={{ marginLeft: 4 }}>{STATUS_LABEL[selectedOrder.status]}</span>
                    </div>
                  </div>

                  <div className="prev-body">
                    <div className="prev-section-lbl">Detalles</div>
                    <div className="meta-grid">
                      <div className="meta-tile"><div className="meta-tile-lbl">Mesa</div><div className="meta-tile-val">{selectedOrder.table}</div></div>
                      <div className="meta-tile"><div className="meta-tile-lbl">Responsable</div><div className="meta-tile-val">{selectedOrder.resp}</div></div>
                      <div className="meta-tile"><div className="meta-tile-lbl">Hora</div><div className="meta-tile-val">{selectedOrder.time}</div></div>
                      <div className="meta-tile"><div className="meta-tile-lbl">Total items</div><div className="meta-tile-val">{selectedOrder.items.reduce((s, i) => s + i.qty, 0)}</div></div>
                    </div>

                    <div className="prev-section-lbl">Productos</div>
                    {selectedOrder.items.map((i, index) => (
                      <div key={`${i.productId || i.name}-${index}`} className="prod-list-item">
                        <div className="prod-qty-chip">{i.qty}</div>
                        <div style={{ flex: 1 }}>
                          <div className="prod-pname">{i.name}</div>
                          {i.obs ? <div className="prod-obs-txt">{i.obs}</div> : null}
                        </div>
                        <div className="prod-pamt">{toCurrency(i.price * i.qty)}</div>
                      </div>
                    ))}

                    <div className="prev-totals">
                      <div className="prev-tot-row"><span className="ptl">Subtotal</span><span className="ptv">{toCurrency(selectedOrder.subtotal)}</span></div>
                      <div className="prev-tot-row"><span className="ptl">IVA (16%)</span><span className="ptv">{toCurrency(selectedOrder.tax)}</span></div>
                      <div className="prev-grand-row"><span className="pgl">Total</span><span className="pgv">{toCurrency(selectedOrder.total)}</span></div>
                    </div>
                  </div>

                  <div className="prev-footer">
                    <button className="pf pf-del" type="button" onClick={() => deleteOrder(selectedOrder)}>Eliminar</button>
                    <button className="pf pf-edit" type="button" onClick={() => goCreate(selectedOrder)}>Editar</button>
                    <button className="pf pf-adv" type="button" onClick={() => advanceStatus(selectedOrder)}>Avanzar estado →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="create-view" id="view-create">
            <div className="prod-side">
              <div className="create-topbar">
                <button className="back-btn" type="button" onClick={goList}>
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 2L5 7l4 5"/></svg>
                  Volver
                </button>
                <span className="create-topbar-title">Seleccionar productos</span>
              </div>

              <div className="cat-bar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`cat-btn ${selectedCategory === cat ? 'on' : ''}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="prod-search">
                <div className="prod-search-wrap">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="m11 11 2.5 2.5"/></svg>
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="prod-grid">
                {filteredProducts.map((product) => {
                  const cat = (product.categoria || '').toLowerCase();
                  const emoji = categoryEmoji[cat] || categoryEmoji.otro;
                  return (
                    <div key={product._id} className="prod-tile" onClick={() => addCart(product)}>
                      <div className="prod-tile-top"><span className="prod-tile-emoji">{emoji}</span><span className="prod-tile-plus">+</span></div>
                      <div className="prod-tile-name">{product.nombre}</div>
                      <div className="prod-tile-footer"><span className="prod-tile-price">{toCurrency(product.precio)}</span><span className="prod-tile-cat">{product.categoria}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cart-side">
              <div className="cart-head">
                <div className="cart-head-title">Resumen del pedido</div>
                <div className="cart-info-row">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/></svg>
                  <span className="cart-info-lbl">Mesa</span>
                  <select className="cart-select-inline" value={mesaFormValue} onChange={(e) => setMesaFormValue(e.target.value)}>
                    <option value="">Seleccionar</option>
                    {mesas.map((m) => (
                      <option key={m._id} value={String(m.numero)}>{`Mesa ${m.numero}`}</option>
                    ))}
                  </select>
                </div>
                <div className="cart-info-row">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5"/></svg>
                  <span className="cart-info-lbl">Responsable</span>
                  <span className="cart-info-val">{responsableFormValue}</span>
                </div>
              </div>

              <div className="cart-body">
                {!cart.length ? (
                  <div className="cart-empty-state">
                    <div className="ces-icon"><svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h2l2 8h6l2-6H6"/><circle cx="8" cy="13" r="1"/><circle cx="12" cy="13" r="1"/></svg></div>
                    <div className="ces-t">Carrito vacío</div>
                    <div className="ces-s">Toca un producto para agregarlo</div>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={`${item.productId || item.name}-${index}`} className="ci-card">
                      <div className="ci-top">
                        <span className="ci-emoji">{item.emoji || '🍽️'}</span>
                        <div className="ci-info">
                          <div className="ci-name">{item.name}</div>
                          <div className="ci-unit">{toCurrency(item.price)} c/u</div>
                        </div>
                        <div className="qty-c">
                          <button className="qb" type="button" onClick={() => changeQty(index, -1)}>−</button>
                          <span className="qn">{item.qty}</span>
                          <button className="qb" type="button" onClick={() => changeQty(index, 1)}>+</button>
                        </div>
                        <div className="ci-price">{toCurrency(item.price * item.qty)}</div>
                      </div>

                      <div className="ci-actions">
                        <button className="ci-btn" type="button" onClick={() => toggleObs(index)}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h7M2 12h5"/></svg>
                          {item.obs ? 'Editar nota' : 'Agregar nota'}
                        </button>
                        <button className="ci-btn red" type="button" onClick={() => removeCart(index)} style={{ marginLeft: 'auto' }}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h10M6 5V3h4v2M5 5l.7 8h4.6l.7-8"/></svg>
                          Quitar
                        </button>
                      </div>

                      <div className={`obs-area ${obsOpen[index] ? 'open' : ''}`}>
                        <textarea
                          placeholder="Ej: sin cebolla, extra salsa, sin picante..."
                          value={item.obs || ''}
                          onChange={(e) => updateObs(index, e.target.value)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-foot">
                <div className="cf-row"><span className="cfl">Subtotal</span><span className="cfv">{toCurrency(cartSubtotal)}</span></div>
                <div className="cf-row"><span className="cfl">IVA (16%)</span><span className="cfv">{toCurrency(cartTax)}</span></div>
                <div className="cf-grand"><span className="cfgl">Total a pagar</span><span className="cfgv">{toCurrency(cartTotal)}</span></div>
                <button className="confirm-btn" type="button" onClick={saveOrder} disabled={saving}>
                  {saving ? 'Guardando...' : 'Confirmar pedido'}
                  <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
