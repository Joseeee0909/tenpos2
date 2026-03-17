import React, { useEffect, useMemo, useState } from 'react';
import authService from '../services/api';
import { UxToast } from '../components/UXFeedback';
import '../styles/product.css';

const CATEGORIES = ['Comida', 'Bebida', 'Postre', 'Otro'];
const CATEGORY_TO_EMOJI = {
  Comida: '🍛',
  Bebida: '🥤',
  Postre: '🍰',
  Otro: '📦'
};

const normalizeCategory = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'comida') return 'Comida';
  if (raw === 'bebida' || raw === 'bebidas') return 'Bebida';
  if (raw === 'postre' || raw === 'postres') return 'Postre';
  return 'Otro';
};

const toApiCategory = (value) => String(value || 'otro').toLowerCase();
const toCurrency = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-CO')}`;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [notice, setNotice] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Comida',
    precio: '',
    stock: '',
    descripcion: ''
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

  const loadProducts = async () => {
    try {
      const data = await authService.getProducts();
      const normalized = (Array.isArray(data) ? data : []).map((p) => {
        const cat = normalizeCategory(p.categoria);
        return {
          _id: p._id,
          idproducto: p.idproducto || '',
          nombre: p.nombre || 'Producto',
          categoria: cat,
          precio: Number(p.precio || 0),
          stock: Number(p.stock || 0),
          descripcion: p.descripcion || '',
          disponible: p.disponible !== false,
          emoji: CATEGORY_TO_EMOJI[cat] || CATEGORY_TO_EMOJI.Otro
        };
      });
      setProducts(normalized);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProducts([]);
      pushNotice('No se pudieron cargar los productos.', 'error');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const byCategory = currentFilter === 'all' || p.categoria === currentFilter;
      const byAvailability = !onlyAvailable || p.disponible;
      const bySearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q);
      return byCategory && byAvailability && bySearch;
    });
  }, [products, searchTerm, currentFilter, onlyAvailable]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((p) => p.disponible).length,
      inactive: products.filter((p) => !p.disponible).length,
      lowStock: products.filter((p) => p.stock <= 3).length
    };
  }, [products]);

  const openNew = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      categoria: 'Comida',
      precio: '',
      stock: '',
      descripcion: ''
    });
    setEditorOpen(true);
  };

  const openEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      nombre: product.nombre,
      categoria: product.categoria,
      precio: String(product.precio),
      stock: String(product.stock),
      descripcion: product.descripcion
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setSaving(false);
  };

  const saveProduct = async () => {
    const nombre = formData.nombre.trim();
    const descripcion = formData.descripcion.trim();
    const precio = Number(formData.precio);
    const stock = Number(formData.stock);

    if (!nombre) {
      pushNotice('El nombre del producto es obligatorio.', 'warning');
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      pushNotice('Ingresa un precio valido mayor a 0.', 'warning');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      pushNotice('Ingresa un stock valido (0 o mayor).', 'warning');
      return;
    }

    const payload = {
      nombre,
      categoria: toApiCategory(formData.categoria),
      precio,
      stock,
      descripcion,
      idproducto: editingId ? undefined : `P-${Date.now()}`
    };

    setSaving(true);
    try {
      if (editingId) {
        await authService.api.put(`/products/${editingId}`, payload);
        pushNotice('Producto actualizado correctamente.', 'success');
      } else {
        await authService.api.post('/products', payload);
        pushNotice('Producto creado correctamente.', 'success');
      }

      closeEditor();
      await loadProducts();
    } catch (error) {
      console.error('Error guardando producto:', error);
      pushNotice(error.response?.data?.mensaje || 'No se pudo guardar el producto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openToggle = (product) => {
    setToggleTarget(product);
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
      await authService.api.patch(`/products/${toggleTarget._id}/disponible`, {
        disponible: !toggleTarget.disponible
      });

      pushNotice(
        toggleTarget.disponible
          ? 'Producto desactivado correctamente.'
          : 'Producto reactivado correctamente.',
        'success'
      );

      closeToggle();
      await loadProducts();
    } catch (error) {
      console.error('Error cambiando estado del producto:', error);
      pushNotice('No se pudo cambiar el estado del producto.', 'error');
      setToggling(false);
    }
  };

  return (
    <div className="products-v3 app">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <div className="topbar">
        <div className="topbar-left">
          <h2>Gestion de productos</h2>
          <p>{stats.total} productos registrados</p>
        </div>
        <button className="btn-solid" type="button" onClick={openNew}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Nuevo producto
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff' }}><svg viewBox="0 0 16 16" fill="none" stroke="#4f46e5" strokeWidth="1.6"><path d="M3 3h10v2l-2 3v5H5V8L3 5z"/></svg></div>
          <div><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total productos</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}><svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7"/></svg></div>
          <div><div className="stat-num">{stats.active}</div><div className="stat-lbl">Disponibles</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2' }}><svg viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5"/><path d="M6 6l4 4M10 6l-4 4"/></svg></div>
          <div><div className="stat-num">{stats.inactive}</div><div className="stat-lbl">Desactivados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb' }}><svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 10.5v.5"/></svg></div>
          <div><div className="stat-num">{stats.lowStock}</div><div className="stat-lbl">Stock bajo</div></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="m11 11 2.5 2.5"/></svg>
          <input
            type="text"
            placeholder="Buscar por nombre, categoria o descripcion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button className={`fchip ${currentFilter === 'all' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('all')}>
            <span className="fchip-dot" style={{ background: '#c7d2fe' }}></span>
            Todos
          </button>
          <button className={`fchip ${currentFilter === 'Comida' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Comida')}>
            <span className="fchip-dot" style={{ background: '#a855f7' }}></span>
            Comida
          </button>
          <button className={`fchip ${currentFilter === 'Bebida' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Bebida')}>
            <span className="fchip-dot" style={{ background: '#3b82f6' }}></span>
            Bebida
          </button>
          <button className={`fchip ${currentFilter === 'Postre' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Postre')}>
            <span className="fchip-dot" style={{ background: '#f97316' }}></span>
            Postre
          </button>
          <button className={`fchip ${currentFilter === 'Otro' ? 'on' : ''}`} type="button" onClick={() => setCurrentFilter('Otro')}>
            <span className="fchip-dot" style={{ background: '#22c55e' }}></span>
            Otro
          </button>
        </div>

        <button className={`toggle-avail ${onlyAvailable ? 'on' : ''}`} type="button" onClick={() => setOnlyAvailable((prev) => !prev)}>
          <div className={`sw ${onlyAvailable ? 'on' : ''}`}><div className="sw-k"></div></div>
          Solo disponibles
        </button>
      </div>

      <div className="table-wrap">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h10v2l-2 3v5H5V8L3 5z"/></svg></div>
            <div className="empty-t">Sin resultados</div>
            <div className="empty-s">Prueba con otro filtro o busqueda</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="prod-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '230px' }}>Producto</th>
                  <th>Categoria</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Descripcion</th>
                  <th style={{ textAlign: 'center', minWidth: '110px' }}>Estado</th>
                  <th style={{ textAlign: 'center', minWidth: '100px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p._id} className={`prod-row ${p.disponible ? '' : 'inactive'}`}>
                    <td>
                      <div className="prod-info">
                        <div className="prod-emoji-box" style={{ filter: p.disponible ? 'none' : 'grayscale(1)' }}>{p.emoji}</div>
                        <div>
                          <div className="prod-name">{p.nombre}</div>
                          <div className="prod-id">#{String(p.idproducto || '').slice(-6) || p._id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`cat-pill cat-${p.categoria}`}>{p.categoria}</span></td>
                    <td><span className="price-val">{toCurrency(p.precio)}</span></td>
                    <td><span className={`stock-val ${p.stock <= 3 ? 'stock-low' : ''}`}>{p.stock}{p.stock <= 3 ? ' ⚠️' : ''}</span></td>
                    <td><span className="desc-cell" title={p.descripcion}>{p.descripcion}</span></td>
                    <td>
                      <div className="avail-cell">
                        <span className={`avail-badge ${p.disponible ? 'avail-on' : 'avail-off'}`}>
                          <span className="avail-dot" style={{ background: p.disponible ? '#10b981' : '#cbd5e1' }}></span>
                          {p.disponible ? 'Disponible' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn" type="button" title="Editar" onClick={() => openEdit(p)}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 2l3 3-8 8H3v-3z"/></svg>
                        </button>
                        <button className={`act-btn ${p.disponible ? 'deact' : 'react'}`} type="button" title={p.disponible ? 'Desactivar' : 'Reactivar'} onClick={() => openToggle(p)}>
                          {p.disponible ? (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5"/><path d="M6 6l4 4M10 6l-4 4"/></svg>
                          ) : (
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7"/></svg>
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
              <span className="mtitle">{editingId ? 'Editar producto' : 'Nuevo producto'}</span>
              <button className="mclose" type="button" onClick={closeEditor}>×</button>
            </div>
            <div className="mbody">
              <div className="form-2">
                <div>
                  <label className="form-lbl">Nombre</label>
                  <input className="finput" placeholder="Ej: Bandeja paisa" value={formData.nombre} onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))} />
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
                  <label className="form-lbl">Precio (COP)</label>
                  <input className="finput" type="number" placeholder="0" value={formData.precio} onChange={(e) => setFormData((prev) => ({ ...prev, precio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-lbl">Stock</label>
                  <input className="finput" type="number" placeholder="0" value={formData.stock} onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-lbl">Descripcion</label>
                <textarea className="ftextarea" placeholder="Describe brevemente el producto..." value={formData.descripcion} onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}></textarea>
              </div>
            </div>
            <div className="mfooter">
              <button className="mf-cancel" type="button" onClick={closeEditor}>Cancelar</button>
              <button className="mf-save" type="button" onClick={saveProduct} disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear producto'}</button>
            </div>
          </div>
        </div>
      )}

      {toggleOpen && toggleTarget && (
        <div className="overlay" onClick={closeToggle}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{toggleTarget.disponible ? 'Desactivar producto' : 'Reactivar producto'}</span>
              <button className="mclose" type="button" onClick={closeToggle}>×</button>
            </div>
            <div className="mbody">
              <div className="warn-box">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 10.5v.5"/></svg>
                <p>
                  {toggleTarget.disponible ? (
                    <>El producto <strong>{toggleTarget.nombre}</strong> quedara <strong>inactivo</strong> y no podra anadirse a nuevos pedidos. Puedes reactivarlo en cualquier momento.</>
                  ) : (
                    <>El producto <strong>{toggleTarget.nombre}</strong> volvera a estar <strong>disponible</strong> y podra anadirse a nuevos pedidos.</>
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
