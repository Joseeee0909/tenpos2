// src/pages/product.jsx
import React, { useState, useEffect } from 'react';
import authService from '../services/api';
import '../styles/product.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    categoria: 'comida',
    descripcion: '',
    stock: '',
  });

  const categories = [
    { value: 'comida', label: 'Comida' },
    { value: 'bebida', label: 'Bebida' },
    { value: 'postre', label: 'Postre' },
    { value: 'otro',  label: 'Otro' }
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  // ---------------- FETCH PRODUCTS ----------------
  const fetchProducts = async () => {
    try {
      const data = await authService.getProducts(); // Usamos el método de api.js
      setProducts(
        data.map(p => ({
          id: p._id,
          nombre: p.nombre,
          precio: p.precio,
          categoria: p.categoria,
          descripcion: p.descripcion,
          stock: Number(p.stock),
          disponible: p.disponible !== false
        }))
      );
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  // ---------------- CREATE PRODUCT ----------------
  const createProduct = async () => {
    const res = await authService.api.post('/products/productos', formData);
    const p = res.data.producto;
    return {
      id: p._id,
      nombre: p.nombre,
      precio: p.precio,
      categoria: p.categoria,
      descripcion: p.descripcion,
      stock: Number(p.stock),
      disponible: p.disponible !== false
    };
  };

  // ---------------- UPDATE PRODUCT ----------------
  const updateProduct = async (id) => {
    const res = await authService.api.put(`/products/productos/${id}`, formData);
    const p = res.data.producto;
    return {
      id: p._id,
      nombre: p.nombre,
      precio: p.precio,
      categoria: p.categoria,
      descripcion: p.descripcion,
      stock: Number(p.stock),
      disponible: p.disponible !== false
    };
  };

  // ---------------- DELETE / TOGGLE ----------------
  const deleteProduct = async (id) => {
    await authService.api.delete(`/products/productos/${id}`);
  };

  const toggleDisponible = async (id, valor) => {
    try {
      await authService.api.patch(`/products/productos/${id}/disponible`, { disponible: valor });
      setProducts(products.map(p =>
        p.id === id ? { ...p, disponible: valor } : p
      ));
    } catch (err) {
      console.error('Error cambiando disponibilidad:', err);
    }
  };

  // ---------------- MODAL ----------------
  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        nombre: product.nombre,
        precio: product.precio,
        categoria: product.categoria,
        descripcion: product.descripcion,
        stock: product.stock
      });
    } else {
      setEditingProduct(null);
      setFormData({
        nombre: '',
        precio: '',
        categoria: 'comida',
        descripcion: '',
        stock: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      nombre: '',
      precio: '',
      categoria: 'comida',
      descripcion: '',
      stock: ''
    });
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id);
        setProducts(products.map(p => (p.id === editingProduct.id ? updated : p)));
      } else {
        const created = await createProduct();
        setProducts([...products, created]);
      }
      handleCloseModal();
    } catch (err) {
      alert('Error guardando el producto');
    }
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (id) => {
    if (!window.confirm('¿Marcar como NO disponible?')) return;
    try {
      await deleteProduct(id);
      setProducts(products.map(p =>
        p.id === id ? { ...p, disponible: false } : p
      ));
    } catch (err) {
      alert('Error marcando como no disponible');
    }
  };

  // ---------------- STOCK ----------------
  const getStockClass = (stock) => {
    const s = Number(stock);
    if (s < 5) return 'stock-red';
    if (s < 10) return 'stock-yellow';
    return 'stock-green';
  };

  // ---------------- FILTER ----------------
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.categoria === filterCategory;
    const matchesAvailable = !showOnlyAvailable || product.disponible;
    return matchesSearch && matchesCategory && matchesAvailable;
  });

  return (
    <div className="products-container">
      {/* HEADER */}
      <div className="products-header">
        <div className="header-content">
          <h1>Gestión de Productos</h1>
          <p>Administra el catálogo completo del restaurante</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <span className="btn-icon">➕</span> Nuevo Producto
        </button>
      </div>

      {/* FILTROS */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            Todos
          </button>

          <div className="available-filter">
            <label>
              <input
                type="checkbox"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              />
              Mostrar solo disponibles
            </label>
          </div>

          {categories.map(cat => (
            <button
              key={cat.value}
              className={`filter-btn ${filterCategory === cat.value ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA */}
      <div className="products-table-container">
        {filteredProducts.length > 0 ? (
          <table className="products-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>CATEGORÍA</th>
                <th>PRECIO</th>
                <th>STOCK</th>
                <th>DESCRIPCIÓN</th>
                <th>ACCIONES</th>
                <th>DISPONIBLE</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className={!product.disponible ? 'inactive-row' : ''}>
                  <td>{product.nombre}</td>
                  <td>{product.categoria}</td>
                  <td>${product.precio}</td>
                  <td><span className={`stock-badge ${getStockClass(product.stock)}`}>{product.stock} unidades</span></td>
                  <td>{product.descripcion}</td>
                  <td>
                    <button className="action-btn edit" onClick={() => handleOpenModal(product)}>✏️</button>
                    <button className="action-btn edit" onClick={() => toggleDisponible(product.id, !product.disponible)}>
                      {product.disponible ? '❌ Desactivar' : '✔ Activar'}
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(product.id)}>🗑️</button>
                  </td>
                  <td>{product.disponible ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No se encontraron productos</h3>
            <p>Intenta cambiar los filtros o agregar un nuevo producto</p>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  >
                    {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
