import { useEffect, useMemo, useState } from 'react';
import authService from '../services/api';
import PageHeader from '../components/PageHeader';
import { UxToast } from '../components/UXFeedback';
import { getStoredSettings } from '../utils/settings';
import AIInventoryModal from '../components/AIInventoryModal';
import '../styles/inventario.css';

const CATEGORIES = ['Proteina', 'Lacteos', 'Abarrotes', 'Frutas', 'Verduras', 'Insumos', 'Limpieza', 'Otro'];
const CATEGORY_TO_EMOJI = {
  Proteina: '🍖',
  Lacteos: '🧀',
  Abarrotes: '🧂',
  Frutas: '🍎',
  Verduras: '🥗',
  Insumos: '🧪',
  Limpieza: '🧼',

  Otro: '📦'
};

const normalizeCategory = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'proteina') return 'Proteina';
  if (raw === 'lacteos') return 'Lacteos';
  if (raw === 'abarrotes') return 'Abarrotes';
  if (raw === 'frutas') return 'Frutas';
  if (raw === 'verduras') return 'Verduras';
  if (raw === 'insumos') return 'Insumos';
  if (raw === 'limpieza') return 'Limpieza';
  return 'Otro';
};

const toApiCategory = (value) => String(value || 'otro').toLowerCase();
const toCurrency = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-CO')}`;

const getStockState = (stock) => {
  const value = Number(stock || 0);
  if (value <= 3) return { key: 'red', label: 'Critico' };
  if (value <= 8) return { key: 'yellow', label: 'Medio' };
  return { key: 'green', label: 'Alto' };
};

export default function InventarioPage() {
  const [appSettings, setAppSettings] = useState(getStoredSettings());
  const [lowStockNoticeKey, setLowStockNoticeKey] = useState('');
  const [materiasPrimas, setMateriasPrimas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('name_asc');

  const [notice, setNotice] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Proteina',
    stock: '',
    unidad: 'Unidad',
    idMateriaPrima: ''
  });

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const loadMateriasPrimas = async () => {
    try {
      const data = await authService.getInventario();
      const materias = data.MateriasPrimas || [];

      const normalized = materias.map((i) => {
        const cat = normalizeCategory(i.categoria);
        return {
          id: i.id,
          idMateriaPrima: i.idMateriaPrima || '',
          nombre: i.nombre || 'Materia Prima',
          categoria: cat,
          stock: Number(i.stock || 0),
          disponible: i.disponible !== false,
          unidad: i.unidad || 'Unidad/es',
          emoji: CATEGORY_TO_EMOJI[cat] || CATEGORY_TO_EMOJI.Otro
        };
      });
      setMateriasPrimas(normalized);
    } catch (error) {
      console.error('Error cargando materias primas:', error);
      setMateriasPrimas([]);
      pushNotice('No se pudieron cargar las materias primas.', 'error');
    }
  };

  useEffect(() => {
    loadMateriasPrimas();
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const next = event?.detail || getStoredSettings();
      setAppSettings(next);
    };
    window.addEventListener('app-settings-updated', handler);
    return () => window.removeEventListener('app-settings-updated', handler);
  }, []);

  const filteredMateriasPrimas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = materiasPrimas.filter((i) => {
      const byCategory = currentFilter === 'all' || i.categoria === currentFilter;
      const byAvailability = !onlyAvailable || i.disponible;
      const bySearch =
        !q ||
        i.idMateriaPrima.toLowerCase().includes(q) ||
        i.nombre.toLowerCase().includes(q) ||
        i.categoria.toLowerCase().includes(q) ||
        i.unidad.toLowerCase().includes(q);

      return byCategory && byAvailability && bySearch;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'name_desc') return b.nombre.localeCompare(a.nombre, 'es');
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [materiasPrimas, searchTerm, currentFilter, onlyAvailable, sortBy]);

  const lowStockThreshold = Number(appSettings.lowStockThreshold || 0);
  const stats = useMemo(() => {
    return {
      total: materiasPrimas.length,
      active: materiasPrimas.filter((i) => i.disponible).length,
      inactive: materiasPrimas.filter((i) => !i.disponible).length,
      lowStock: materiasPrimas.filter((i) => i.stock <= lowStockThreshold).length
    };
  }, [materiasPrimas, lowStockThreshold]);

  useEffect(() => {
    if (!appSettings.lowStockAlerts) return;
    if (!stats.lowStock) {
      if (lowStockNoticeKey) setLowStockNoticeKey('');
      return;
    }

    const key = `${lowStockThreshold}-${stats.lowStock}`;
    if (key === lowStockNoticeKey) return;

    pushNotice(
      `Alerta: ${stats.lowStock} materia(s) prima(s) con stock bajo (<= ${lowStockThreshold}).`,
      'warning'
    );
    setLowStockNoticeKey(key);
  }, [appSettings.lowStockAlerts, lowStockThreshold, stats.lowStock, lowStockNoticeKey]);

  const openNew = () => {
    setEditingId(null);
    setFormData({
      idMateriaPrima: '',
      nombre: '',
      categoria: 'Proteina',
      stock: '',
      unidad: 'Unidad'
    });
    setEditorOpen(true);
  };

  const openEdit = (materiaPrima) => {
    setEditingId(materiaPrima.idMateriaPrima);
    setFormData({
      idMateriaPrima: materiaPrima.idMateriaPrima,
      nombre: materiaPrima.nombre,
      categoria: materiaPrima.categoria,
      stock: String(materiaPrima.stock),
      unidad: materiaPrima.unidad,
    });
    setEditorOpen(true);
  };
  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setSaving(false);
  };

  const saveMateriaPrima = async () => {
    const idMateriaPrima = formData.idMateriaPrima.trim();
    const nombre = formData.nombre.trim();
    const categoria = formData.categoria.trim();
    const stock = Number(formData.stock);
    const unidad = formData.unidad.trim();

    if (!idMateriaPrima) {
      pushNotice('El ID de la materia prima es obligatorio.', 'warning');
      return;
    }

    if (!unidad) {
      pushNotice('La unidad de la materia prima es obligatoria.', 'warning');
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      pushNotice('Ingresa un stock valido (0 o mayor).', 'warning');
      return;
    }

    const payload = {
      nombre,
      categoria: toApiCategory(formData.categoria),
      stock,
      unidad,
      idMateriaPrima: formData.idMateriaPrima.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await authService.api.put(`/materias-primas/${editingId}`, payload);
        pushNotice('Materia prima actualizada correctamente.', 'success');
      } else {
        await authService.api.post('/materias-primas', payload);
        pushNotice('Materia prima creada correctamente.', 'success');
      }

      closeEditor();
      await loadMateriasPrimas();
    } catch (error) {
      console.error('Error guardando materia prima:', error);
      pushNotice(error.response?.data?.mensaje || 'No se pudo guardar la materia prima.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openToggle = (materiaPrima) => {
    setToggleTarget(materiaPrima);
    setToggleOpen(true);
  };

  const closeToggle = () => {
    setToggleTarget(null);
    setToggleOpen(false);
    setToggling(false);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;

    setToggling(true);
    try {
      await authService.api.patch(`/materias-primas/${toggleTarget.idMateriaPrima}/disponible`, {
        disponible: !toggleTarget.disponible
      });

      pushNotice(
        toggleTarget.disponible
          ? 'Materia prima desactivada correctamente.'
          : 'Materia prima reactivada correctamente.',
        'success'
      );

      closeToggle();
      await loadMateriasPrimas();
    } catch (error) {
      console.error('Error cambiando estado de la materia prima:', error);
      pushNotice('No se pudo cambiar el estado de la materia prima.', 'error');
      setToggling(false);
    }
  };

  return (
    <div className="products-v3 app">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <PageHeader
        label="Gestion de inventario"
        title="Gestion de materias primas"
        subtitle={`${stats.total} materias primas registradas`}
        iconColor="#3b3b7d"
        icon={(
          <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
            <path d="M4 4h12v3l-3 4v6H7v-6z" />
          </svg>
        )}
        actions={(
          <>
            <button className="btn-solid" type="button" onClick={() => setIsOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" /></svg>
              Predicciones de IA
            </button>
            <AIInventoryModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
            />
            <button className="btn-solid" type="button" onClick={openNew}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" /></svg>
              Nueva materia prima
            </button>
          </>
        )}

      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff' }}><svg viewBox="0 0 16 16" fill="none" stroke="#4f46e5" strokeWidth="1.6"><path d="M3 3h10v2l-2 3v5H5V8L3 5z" /></svg></div>
          <div><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total materias primas</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}><svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg></div>
          <div><div className="stat-num">{stats.active}</div><div className="stat-lbl">Disponibles</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2' }}><svg viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M6 6l4 4M10 6l-4 4" /></svg></div>
          <div><div className="stat-num">{stats.inactive}</div><div className="stat-lbl">Desactivados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb' }}><svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6"><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 10.5v.5" /></svg></div>
          <div><div className="stat-num">{stats.lowStock}</div><div className="stat-lbl">Stock bajo</div></div>
        </div>
      </div>

      <div className="toolbar">

        {/* FILA SUPERIOR: Buscador + Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
          <div className="search-box">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11.5 6.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM15 15l-3.5-3.5" />
            </svg>
            <input type="text" placeholder="Buscar por nombre, categoria..." />
          </div>

          <div className="filter-group">
            <button className={`fchip ${currentFilter === 'all' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('all')}>
              <span className="fchip-dot" style={{ background: '#c7d2fe' }}></span> Todos
            </button>
            <button className={`fchip ${currentFilter === 'Proteina' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Proteina')}>
              <span className="fchip-dot" style={{ background: '#a855f7' }}></span> Proteina
            </button>
            <button className={`fchip ${currentFilter === 'Abarrotes' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Abarrotes')}>
              <span className="fchip-dot" style={{ background: '#3b82f6' }}></span> Abarrotes
            </button>
            <button className={`fchip ${currentFilter === 'Frutas' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Frutas')}>
              <span className="fchip-dot" style={{ background: '#f9162dc8' }}></span> Frutas
            </button>
            <button className={`fchip ${currentFilter === 'Verduras' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Verduras')}>
              <span className="fchip-dot" style={{ background: '#0fa730' }}></span> Verduras
            </button>
            <button className={`fchip ${currentFilter === 'Lacteos' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Lacteos')}>
              <span className="fchip-dot" style={{ background: '#e2f916' }}></span> Lacteos
            </button>
            <button className={`fchip ${currentFilter === 'Limpieza' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Limpieza')}>
              <span className="fchip-dot" style={{ background: '#16f94f' }}></span> Limpieza
            </button>
            <button className={`fchip ${currentFilter === 'Insumos' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Insumos')}>
              <span className="fchip-dot" style={{ background: '#e2f916' }}></span> Insumos
            </button>
            <button className={`fchip ${currentFilter === 'Otro' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Otro')}>
              <span className="fchip-dot" style={{ background: '#f9165a' }}></span> Otro
            </button>
          </div>
        </div>

        {/* FILA INFERIOR: Solo disponibles + Ordenar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <button className={`toggle-avail ${onlyAvailable ? 'on' : ''}`} type="button" onClick={() => setOnlyAvailable((prev) => !prev)}>
            <div className={`sw ${onlyAvailable ? 'on' : ''}`}><div className="sw-k"></div></div>
            Solo disponibles
          </button>

          <div className="sort-wrap" aria-label="Ordenar materias primas">
            <span className="sort-label">Ordenar</span>
            <div className="sort-select-wrap">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M5 3h8M3 8h10M7 13h6" />
              </svg>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name_asc">Nombre (A-Z)</option>
                <option value="name_desc">Nombre (Z-A)</option>
                <option value="stock_asc">Stock (menor a mayor)</option>
                <option value="stock_desc">Stock (mayor a menor)</option>
              </select>
              <svg className="sort-caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      <div className="table-wrap">
        {filteredMateriasPrimas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h10v2l-2 3v5H5V8L3 5z" /></svg></div>
            <div className="empty-t">Sin resultados</div>
            <div className="empty-s">Prueba con otro filtro o busqueda</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="prod-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '230px' }}>Materia Prima</th>
                  <th>Categoria</th>
                  <th>Stock</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: 'center', minWidth: '110px' }}>Estado</th>
                  <th style={{ textAlign: 'center', minWidth: '100px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriasPrimas.map((i) => (
                  <tr key={i.id} className={`prod-row ${i.disponible ? '' : 'inactive'}`}>
                    <td>
                      <div className="prod-info">
                        <div className="prod-emoji-box" style={{ filter: i.disponible ? 'none' : 'grayscale(1)' }}>{i.emoji}</div>
                        <div>
                          <div className="prod-name">{i.nombre}</div>
                          <div className="prod-id">#{String(i.idMateriaPrima || '').slice(-6) || i.id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`cat-pill cat-${i.categoria}`}>{i.categoria}</span></td>
                    <td>
                      <div className="stock-cell">
                        <span className="stock-val">{i.stock}</span>
                        <span className={`stock-state ${`stock-${getStockState(i.stock).key}`}`}>
                          <span className="stock-dot"></span>
                          {getStockState(i.stock).label}
                        </span>
                      </div>
                    </td>
                    <td>{i.unidad}</td>
                    <td>
                      <div className="avail-cell">
                        <span className={`avail-badge ${i.disponible ? 'avail-on' : 'avail-off'}`}>
                          <span className="avail-dot" style={{ background: i.disponible ? '#10b981' : '#cbd5e1' }}></span>
                          {i.disponible ? 'Disponible' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn" type="button" title="Editar" onClick={() => openEdit(i)}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 2l3 3-8 8H3v-3z" /></svg>
                        </button>
                        <button className={`act-btn ${i.disponible ? 'deact' : 'react'}`} type="button" title={i.disponible ? 'Desactivar' : 'Reactivar'} onClick={() => openToggle(i)}>
                          {i.disponible ? (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M6 6l4 4M10 6l-4 4" /></svg>
                          ) : (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {editorOpen && (
        <div className="overlay" onClick={closeEditor}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{editingId ? 'Editar Materia Prima' : 'Nueva Materia Prima'}</span>
              <button className="mclose" type="button" onClick={closeEditor}>×</button>
            </div>
            <div className="mbody">
              <div className="form-1">

                <div>
                  <label className="form-lbl">ID Materia Prima</label>
                  <input className="finput" placeholder="Ej: Proteina-001" value={formData.idMateriaPrima} onChange={(e) => setFormData((prev) => ({ ...prev, idMateriaPrima: e.target.value }))} />
                </div>
              </div>
              <div className="form-2">
                <div>
                  <label className="form-lbl">Nombre</label>
                  <input className="finput" placeholder="Ej: Carne de res" value={formData.nombre} onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="form-lbl">Categoria</label>
                  <select className="fselect" value={formData.categoria} onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-2">
                <div>
                  <label className="form-lbl">Stock</label>
                  <input className="finput" type="number" placeholder="0" value={formData.stock} onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))} />
                </div>
                <div>
                  <label className="form-lbl">Unidad</label>
                  <input className="finput" placeholder="Ej: kg, lt, unidades" value={formData.unidad} onChange={(e) => setFormData((prev) => ({ ...prev, unidad: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mfooter">
              <button className="mf-cancel" type="button" onClick={closeEditor}>Cancelar</button>
              <button className="mf-save" type="button" onClick={saveMateriaPrima} disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear materia prima    '}</button>
            </div>
          </div>
        </div>
      )}

      {toggleOpen && toggleTarget && (
        <div className="overlay" onClick={closeToggle}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{toggleTarget.disponible ? 'Desactivar Materia Prima' : 'Reactivar Materia Prima'}</span>
              <button className="mclose" type="button" onClick={closeToggle}>×</button>
            </div>
            <div className="mbody">
              <div className="warn-box">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 10.5v.5" /></svg>
                <p>
                  {toggleTarget.disponible ? (
                    <>La materia prima <strong>{toggleTarget.nombre}</strong> quedara <strong>inactiva</strong> y no podra anadirse a nuevos pedidos. Puedes reactivarla en cualquier momento.</>
                  ) : (
                    <>La materia prima <strong>{toggleTarget.nombre}</strong> volvera a estar <strong>disponible</strong> y podra anadirse a nuevos pedidos.</>
                  )}
                </p>
              </div>
              <div className="prod-preview">
                <div className="pp-emoji">{toggleTarget.emoji}</div>
                <div>
                  <div className="pp-name">{toggleTarget.nombre}</div>
                  <div className="pp-meta">{toggleTarget.categoria} · {toCurrency(toggleTarget.precio)} · Stock: {toggleTarget.stock}</div>
                </div>
              </div>
            </div>
            <div className="mfooter">
              <button className="mf-cancel" type="button" onClick={closeToggle}>Cancelar</button>
              <button className={toggleTarget.disponible ? 'mf-danger' : 'mf-success'} type="button" onClick={confirmToggle} disabled={toggling}>
                {toggling ? 'Procesando...' : toggleTarget.disponible ? 'Si, desactivar' : 'Si, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
