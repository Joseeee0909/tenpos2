import React, { useState, useEffect } from 'react';
import authService from '../services/api';
import '../styles/mesas.css';

export default function MesasPage() {
  const [mesas, setMesas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todas');
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const [formData, setFormData] = useState({
    numero: '',
    capacidad: '4',
    estado: 'disponible'
  });

  useEffect(() => {
    fetchMesas();
  }, []);

  // Cerrar menú cuando se haga clic fuera
  useEffect(() => {
    document.addEventListener('click', () => setOpenMenuId(null));
    return () => document.removeEventListener('click', () => {});
  }, []);

  const fetchMesas = async () => {
    try {
      setLoading(true);
      const data = await authService.getMesas();
      setMesas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching mesas:', err);
      setMesas([]);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const total = mesas.length;
    const disponibles = mesas.filter(m => m.estado === 'disponible').length;
    const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
    const reservadas = mesas.filter(m => m.estado === 'reservada').length;
    return { total, disponibles, ocupadas, reservadas };
  };

  const getFilteredMesas = () => {
    if (activeFilter === 'todas') return mesas;
    return mesas.filter(m => m.estado === activeFilter);
  };

  const handleOpenModal = (mesa = null) => {
    if (mesa) {
      setEditingMesa(mesa);
      setFormData({
        numero: mesa.numero.toString(),
        capacidad: mesa.capacidad.toString(),
        estado: mesa.estado
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
      alert('Ingrese el número de mesa');
      return;
    }

    try {
      if (editingMesa) {
        await authService.actualizarMesa(editingMesa._id, {
          numero: parseInt(formData.numero),
          capacidad: parseInt(formData.capacidad),
          estado: formData.estado
        });
      } else {
        await authService.crearMesa(parseInt(formData.numero), parseInt(formData.capacidad));
      }
      await fetchMesas();
      handleCloseModal();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.mensaje || err.message));
    }
  };

  const handleDeleteMesa = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta mesa?')) {
      try {
        await authService.eliminarMesa(id);
        await fetchMesas();
        setOpenMenuId(null);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleChangeEstado = async (mesa) => {
    const estadoCiclo = { disponible: 'ocupada', ocupada: 'reservada', reservada: 'disponible' };
    const nuevoEstado = estadoCiclo[mesa.estado] || 'disponible';
    
    try {
      await authService.actualizarMesa(mesa._id, { estado: nuevoEstado });
      await fetchMesas();
      setOpenMenuId(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleInitializeMesas = async () => {
    try {
      setLoading(true);
      await authService.inicializarMesas();
      await fetchMesas();
    } catch (err) {
      console.error('Error initializing mesas:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (e, mesaId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === mesaId ? null : mesaId);
  };

  const stats = getStats();
  const filteredMesas = getFilteredMesas();
  const estadoLabels = { disponible: 'Disponible', ocupada: 'Ocupada', reservada: 'Reservada' };

  return (
    <div className="mesas-app">
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
              <div key={mesa._id} className={`card ${mesa.estado}`}>
                <div className="card-head">
                  <div className="card-info">
                    <div className="mesa-num">Mesa {mesa.numero}</div>
                    <span className={`badge ${mesa.estado}`}>
                      {estadoLabels[mesa.estado]}
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
                    <button className="card-btn" onClick={() => handleChangeEstado(mesa)}>
                      Cambiar estado
                    </button>
                    <button className="card-btn primary" onClick={() => handleOpenModal(mesa)}>
                      Editar
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
                    {['disponible', 'ocupada', 'reservada'].map(estado => (
                      <div key={estado} className="estado-opt">
                        <input
                          type="radio"
                          name="estado"
                          id={`est-${estado}`}
                          value={estado}
                          checked={formData.estado === estado}
                          onChange={(e) => setFormData({...formData, estado: e.target.value})}
                        />
                        <label htmlFor={`est-${estado}`}>
                          <span className={`estado-dot ${estado}`}></span>
                          {estado.charAt(0).toUpperCase() + estado.slice(1)}
                        </label>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
}
