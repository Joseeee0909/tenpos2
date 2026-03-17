import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/api';
import '../styles/mesas.css';

const ACTIVE_ORDER_STATES = new Set(['pendiente', 'preparando', 'listo']);

const formatCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('es-CO')}`;

const getOrderTotal = (pedido) => {
  if (!pedido) return 0;
  if (typeof pedido.total === 'number') return pedido.total;
  const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
  return productos.reduce((sum, item) => {
    const qty = Number(item?.cantidad || 0);
    const price = Number(item?.precio || 0);
    return sum + qty * price;
  }, 0);
};

const formatClock = (value) => {
  const date = new Date(value || Date.now());
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function MesasPage() {
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todas');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [actionMesa, setActionMesa] = useState(null);
  
  const [formData, setFormData] = useState({
    numero: '',
    capacidad: '4',
    estado: 'disponible'
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  // Cerrar menú cuando se haga clic fuera
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mesasData, pedidosData] = await Promise.all([
        authService.getMesas(),
        authService.getPedidos()
      ]);
      setMesas(Array.isArray(mesasData) ? mesasData : []);
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
    } catch (err) {
      console.error('Error fetching mesas/pedidos:', err);
      setMesas([]);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

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

  const activePedidoByMesa = useMemo(() => {
    const ordered = [...pedidos]
      .filter((p) => ACTIVE_ORDER_STATES.has(String(p?.estado || '').toLowerCase()))
      .sort((a, b) => new Date(b?.fecha || 0).getTime() - new Date(a?.fecha || 0).getTime());

    const map = new Map();
    for (const pedido of ordered) {
      const mesaNumero = Number(pedido?.mesa);
      if (!Number.isNaN(mesaNumero) && !map.has(mesaNumero)) {
        map.set(mesaNumero, pedido);
      }
    }
    return map;
  }, [pedidos]);

  const mesasUi = useMemo(() => {
    return mesas.map((mesa) => {
      const hasActiveOrder = activePedidoByMesa.has(Number(mesa.numero));
      return {
        ...mesa,
        estadoUi: hasActiveOrder ? 'ocupada' : mesa.estado,
        activePedido: activePedidoByMesa.get(Number(mesa.numero)) || null
      };
    });
  }, [mesas, activePedidoByMesa]);

  const getStats = () => {
    const total = mesasUi.length;
    const disponibles = mesasUi.filter((m) => m.estadoUi === 'disponible').length;
    const ocupadas = mesasUi.filter((m) => m.estadoUi === 'ocupada').length;
    const reservadas = mesasUi.filter((m) => m.estadoUi === 'reservada').length;
    return { total, disponibles, ocupadas, reservadas };
  };

  const getFilteredMesas = () => {
    if (activeFilter === 'todas') return mesasUi;
    return mesasUi.filter((m) => m.estadoUi === activeFilter);
  };

  const handleOpenModal = (mesa = null) => {
    if (mesa) {
      setEditingMesa(mesa);
      setFormData({
        numero: mesa.numero.toString(),
        capacidad: mesa.capacidad.toString(),
        estado: mesa.estadoUi || mesa.estado
      });
    } else {
      setEditingMesa(null);
      setFormData({
        numero: '',
        capacidad: '4',
        estado: 'disponible'
      });
    }
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMesa(null);
    setFormData({
      numero: '',
      capacidad: '4',
      estado: 'disponible'
    });
  };

  const handleSaveMesa = async () => {
    if (!formData.numero.trim()) {
      pushNotice('Ingresa el numero de mesa para continuar.', 'warning');
      return;
    }

    try {
      if (editingMesa) {
        const mesaActiveOrder = activePedidoByMesa.get(Number(editingMesa.numero));
        if (mesaActiveOrder && formData.estado !== 'ocupada') {
          pushNotice('Esta mesa tiene un pedido activo. Primero registra el pago para dejarla disponible.', 'warning');
          return;
        }

        await authService.actualizarMesa(editingMesa._id, {
          numero: parseInt(formData.numero),
          capacidad: parseInt(formData.capacidad),
          estado: formData.estado
        });
      } else {
        await authService.crearMesa(parseInt(formData.numero), parseInt(formData.capacidad));
      }
      await fetchData();
      handleCloseModal();
      pushNotice(editingMesa ? 'Mesa actualizada correctamente.' : 'Mesa creada correctamente.', 'success');
    } catch (err) {
      pushNotice(err.response?.data?.mensaje || err.message || 'No se pudo guardar la mesa.', 'error');
    }
  };

  const handleDeleteMesa = async (id) => {
    openConfirm({
      title: 'Eliminar mesa',
      message: 'Esta accion eliminara la mesa del listado. Puedes volver a crearla despues si lo necesitas.',
      confirmLabel: 'Eliminar mesa',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await authService.eliminarMesa(id);
          await fetchData();
          setOpenMenuId(null);
          pushNotice('Mesa eliminada correctamente.', 'success');
        } catch (err) {
          pushNotice(err.response?.data?.mensaje || err.message || 'No se pudo eliminar la mesa.', 'error');
        }
      }
    });
  };

  const handleChangeEstado = async (mesa) => {
    const estadoCiclo = { disponible: 'ocupada', ocupada: 'reservada', reservada: 'disponible' };
    const estadoActual = mesa.estadoUi || mesa.estado;
    const nuevoEstado = estadoCiclo[estadoActual] || 'disponible';
    const mesaActiveOrder = activePedidoByMesa.get(Number(mesa.numero));

    if (mesaActiveOrder && nuevoEstado !== 'ocupada') {
      pushNotice('Esta mesa tiene un pedido sin pagar. Se mantiene en estado Ocupada.', 'warning');
      setOpenMenuId(null);
      return;
    }
    
    try {
      await authService.actualizarMesa(mesa._id, { estado: nuevoEstado });
      await fetchData();
      setOpenMenuId(null);
      pushNotice(`Mesa ${mesa.numero} ahora esta en estado ${nuevoEstado}.`, 'success');
    } catch (err) {
      pushNotice(err.response?.data?.mensaje || err.message || 'No se pudo cambiar el estado.', 'error');
    }
  };

  const handleInitializeMesas = async () => {
    try {
      setLoading(true);
      await authService.inicializarMesas();
      await fetchData();
    } catch (err) {
      console.error('Error initializing mesas:', err);
      pushNotice('No se pudieron inicializar las mesas por defecto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (e, mesaId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === mesaId ? null : mesaId);
  };

  const handleMesaAccess = (mesa) => {
    if (mesa.estadoUi === 'disponible') {
      navigate(`/pedidos?mode=create&mesa=${mesa.numero}`);
      return;
    }

    if (mesa.estadoUi === 'ocupada') {
      const activeOrder = activePedidoByMesa.get(Number(mesa.numero)) || null;
      setActionMesa({ mesa, pedido: activeOrder });
      return;
    }

    pushNotice('Esta mesa esta reservada. Cambia su estado o gestionala desde Pedidos.', 'info');
  };

  const closeActionMesa = () => setActionMesa(null);

  const goEditPedido = () => {
    if (!actionMesa?.mesa) return;
    navigate(`/pedidos?mode=edit&mesa=${actionMesa.mesa.numero}`);
    closeActionMesa();
  };

  const handleQuickPay = async () => {
    if (!actionMesa?.mesa) return;

    const mesaTarget = actionMesa.mesa;
    const activeOrder = actionMesa?.pedido || activePedidoByMesa.get(Number(mesaTarget.numero));
    if (!activeOrder) {
      pushNotice('No se encontro un pedido activo. Se liberara la mesa directamente.', 'info');
    }

    openConfirm({
      title: `Liberar Mesa ${mesaTarget.numero}`,
      message: 'Se marcara el pedido como entregado y la mesa quedara disponible para un nuevo cliente.',
      confirmLabel: 'Confirmar pago y liberar',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          setLoading(true);

          if (activeOrder?._id) {
            await authService.actualizarPedido(activeOrder._id, { estado: 'entregado' });
          }

          await authService.actualizarMesa(mesaTarget._id, { estado: 'disponible', pedido: null });
          await fetchData();
          closeActionMesa();
          pushNotice('Pago registrado. La mesa ya esta disponible.', 'success');
        } catch (err) {
          pushNotice(err.response?.data?.mensaje || 'No se pudo completar el pago de esta mesa.', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const stats = getStats();
  const filteredMesas = getFilteredMesas();
  const estadoLabels = { disponible: 'Disponible', ocupada: 'Ocupada', reservada: 'Reservada' };

  return (
    <div className="mesas-app">
      {notice && (
        <div className={`ux-toast ${notice.type}`} role="status" aria-live="polite">
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar mensaje">×</button>
        </div>
      )}

      {/* HEADER */}
      <header className="mesas-header">
        <div className="header-left">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <div>
            <h1>Gestión de mesas</h1>
            <p>{stats.total} mesa{stats.total !== 1 ? 's' : ''} registrada{stats.total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button className="btn-new" onClick={() => handleOpenModal()}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          Nueva mesa
        </button>
      </header>

      <main className="mesas-main">
        {/* STATS */}
        <div className="stats">
          <div className="stat-chip">
            <span className="stat-dot all"></span>
            <strong>{stats.total}</strong> mesas totales
          </div>
          <div className="stat-chip">
            <span className="stat-dot disponible"></span>
            <strong>{stats.disponibles}</strong> disponibles
          </div>
          <div className="stat-chip">
            <span className="stat-dot ocupada"></span>
            <strong>{stats.ocupadas}</strong> ocupadas
          </div>
          <div className="stat-chip">
            <span className="stat-dot reservada"></span>
            <strong>{stats.reservadas}</strong> reservadas
          </div>
        </div>

        {/* FILTERS */}
        <div className="filters">
          <span className="filter-label">Filtrar</span>
          {['todas', 'disponible', 'ocupada', 'reservada'].map(estado => (
            <div
              key={estado}
              className={`pill ${activeFilter === estado ? 'active' : ''}`}
              onClick={() => setActiveFilter(estado)}
            >
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </div>
          ))}
        </div>

        {/* GRID */}
        <div className="grid">
          {loading ? (
            <div className="loading-message">Cargando mesas...</div>
          ) : filteredMesas.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <h3>Sin mesas en este estado</h3>
              <p>Prueba con otro filtro o agrega una nueva mesa.</p>
              {stats.total === 0 && (
                <button className="btn-init-mesas" onClick={handleInitializeMesas}>
                  Inicializar 10 mesas por defecto
                </button>
              )}
            </div>
          ) : (
            filteredMesas.map(mesa => (
              <div key={mesa._id} className={`card ${mesa.estadoUi}`} onClick={() => handleMesaAccess(mesa)}>
                <div className="card-head">
                  <div className="card-info">
                    <div className="mesa-num">Mesa {mesa.numero}</div>
                    <span className={`badge ${mesa.estadoUi}`}>
                      {estadoLabels[mesa.estadoUi]}
                    </span>
                  </div>
                  <div 
                    className="menu-btn" 
                    onClick={(e) => toggleMenu(e, mesa._id)}
                  >
                    <div className="dots">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                    {openMenuId === mesa._id && (
                      <div className="dropdown open" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleOpenModal(mesa)}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M11 2l3 3-9 9H2v-3L11 2z" />
                          </svg>
                          Editar mesa
                        </button>
                        <button onClick={() => handleChangeEstado(mesa)}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0-.49-4" />
                          </svg>
                          Cambiar estado
                        </button>
                        <div className="sep"></div>
                        <button className="danger" onClick={() => handleDeleteMesa(mesa._id)}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="cap-row">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <circle cx="6" cy="5" r="2.5" />
                      <path d="M2 13c0-2.5 1.8-4 4-4s4 1.5 4 4" />
                      <circle cx="11.5" cy="5" r="2" />
                      <path d="M14 13c0-2-1.2-3.2-2.5-3.4" />
                    </svg>
                    {mesa.capacidad} personas
                  </div>
                  <div className="card-actions">
                    <button className="card-btn" onClick={(e) => { e.stopPropagation(); handleChangeEstado(mesa); }}>
                      Cambiar estado
                    </button>
                    <button className="card-btn primary" onClick={(e) => { e.stopPropagation(); handleMesaAccess(mesa); }}>
                      Abrir pedido
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="modal-bg" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMesa ? 'Editar mesa' : 'Nueva mesa'}</h2>
              <p>{editingMesa ? 'Modifica los datos de esta mesa' : 'Completa los datos de la nueva mesa'}</p>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="3" x2="13" y2="13" />
                  <line x1="13" y1="3" x2="3" y2="13" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                  </svg>
                  Número o nombre de la mesa
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                  placeholder="Ej: Mesa 1, Terraza A…"
                  maxLength="40"
                />
              </div>

              <div className="field">
                <label>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="6" cy="5" r="2.5" />
                    <path d="M2 13c0-2.5 1.8-4 4-4s4 1.5 4 4" />
                    <circle cx="11.5" cy="5" r="2" />
                    <path d="M14 13c0-2-1.2-3.2-2.5-3.4" />
                  </svg>
                  Capacidad
                </label>
                <div className="select-wrap">
                  <select 
                    value={formData.capacidad}
                    onChange={(e) => setFormData({...formData, capacidad: e.target.value})}
                  >
                    <option value="2">2 personas</option>
                    <option value="4">4 personas</option>
                    <option value="6">6 personas</option>
                    <option value="8">8 personas</option>
                    <option value="10">10 personas</option>
                  </select>
                </div>
              </div>

              {editingMesa && (
                <div className="field">
                  <label>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                    Estado
                  </label>
                  <div className="estado-grid">
                    {['disponible', 'ocupada', 'reservada'].map(estado => {
                      const mesaActiveOrder = activePedidoByMesa.get(Number(editingMesa.numero));
                      const isBlocked = Boolean(mesaActiveOrder) && estado !== 'ocupada';
                      return (
                      <div key={estado} className="estado-opt">
                        <input
                          type="radio"
                          name="estado"
                          id={`est-${estado}`}
                          value={estado}
                          checked={formData.estado === estado}
                          disabled={isBlocked}
                          onChange={(e) => setFormData({...formData, estado: e.target.value})}
                        />
                        <label htmlFor={`est-${estado}`} title={isBlocked ? 'Bloqueado: esta mesa tiene un pedido activo' : ''}>
                          <span className={`estado-dot ${estado}`}></span>
                          {estado.charAt(0).toUpperCase() + estado.slice(1)}
                        </label>
                      </div>
                    );})}
                  </div>
                  {activePedidoByMesa.get(Number(editingMesa.numero)) && (
                    <p className="estado-help">Esta mesa tiene un pedido activo. Solo puede permanecer en estado Ocupada hasta registrar el pago.</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveMesa}>
                {editingMesa ? 'Guardar cambios' : 'Guardar mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMesa && (
        <div className="modal-bg" onClick={closeActionMesa}>
          <div className="mesa-quick-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mesa-quick-hero">
              <div className="mesa-quick-badge"><span className="badge-dot"></span>Ocupada</div>
              <div className="mesa-quick-title">Mesa {actionMesa.mesa.numero}</div>
              <div className="mesa-quick-sub">
                Pedido activo · {(actionMesa.pedido?.productos || []).reduce((sum, p) => sum + Number(p?.cantidad || 0), 0)} items · {formatCurrency(getOrderTotal(actionMesa.pedido))}
              </div>
              <div className="mesa-quick-meta">
                <div className="mesa-meta-chip">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5"/></svg>
                  <span>{actionMesa.pedido?.responsable || actionMesa.pedido?.mesero?.nombre || actionMesa.pedido?.mesero?.username || 'Sin asignar'}</span>
                </div>
                <div className="mesa-meta-chip">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 2"/></svg>
                  <span>{formatClock(actionMesa.pedido?.fecha)}</span>
                </div>
                <div className="mesa-meta-chip">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5h10M3 8h7M3 11h5"/></svg>
                  <span>{actionMesa.mesa.capacidad} personas</span>
                </div>
              </div>
            </div>

            <div className="mesa-quick-body">
              <p className="mesa-quick-prompt">¿Que deseas hacer con esta mesa?</p>

              <button className="mesa-modal-btn btn-primary" onClick={goEditPedido}>
                <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8"><path d="M11 2l3 3-8 8H3v-3z"/></svg>
                Editar pedido
              </button>

              <div className="mesa-modal-divider"></div>

              <button className="mesa-modal-btn btn-disabled" onClick={handleQuickPay}>
                <svg viewBox="0 0 16 16" fill="none" stroke="#cbd5e1" strokeWidth="1.8"><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M5 4V3h6v1"/><path d="M5 9h2M10 9h1"/></svg>
                Pagar
                <span className="soon-tag">Proximamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="modal-bg" onClick={closeConfirm}>
          <div className="ux-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className="ux-confirm-actions">
              <button type="button" className="ux-btn ghost" onClick={closeConfirm}>Cancelar</button>
              <button
                type="button"
                className={`ux-btn ${confirmState.confirmType === 'danger' ? 'danger' : 'primary'}`}
                onClick={handleConfirmAccept}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
