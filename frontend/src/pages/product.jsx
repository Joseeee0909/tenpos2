

import React, { useState } from 'react';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Hamburguesa Clásica',
      category: 'Comida',
      price: 12.99,
      stock: 45,
      image: '🍔',
      status: 'active'
    },
    {
      id: 2,
      name: 'Pizza Margherita',
      category: 'Comida',
      price: 15.99,
      stock: 30,
      image: '🍕',
      status: 'active'
    },
    {
      id: 3,
      name: 'Coca Cola',
      category: 'Bebida',
      price: 2.99,
      stock: 120,
      image: '🥤',
      status: 'active'
    },
    {
      id: 4,
      name: 'Cerveza Artesanal',
      category: 'Bebida',
      price: 5.99,
      stock: 8,
      image: '🍺',
      status: 'active'
    },
    {
      id: 5,
      name: 'Ensalada César',
      category: 'Comida',
      price: 9.99,
      stock: 25,
      image: '🥗',
      status: 'active'
    },
    {
      id: 6,
      name: 'Tacos al Pastor',
      category: 'Comida',
      price: 8.99,
      stock: 0,
      image: '🌮',
      status: 'inactive'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Comida',
    price: '',
    stock: '',
    image: '🍽️'
  });

  const categories = ['Comida', 'Bebida', 'Postre', 'Entrada'];

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        image: product.image
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Comida',
        price: '',
        stock: '',
        image: '🍽️'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Comida',
      price: '',
      stock: '',
      image: '🍽️'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingProduct) {
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...formData, price: parseFloat(formData.price), stock: parseInt(formData.stock) }
          : p
      ));
    } else {
      const newProduct = {
        id: products.length + 1,
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        status: parseInt(formData.stock) > 0 ? 'active' : 'inactive'
      };
      setProducts([...products, newProduct]);
    }
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleToggleStatus = (id) => {
    setProducts(products.map(p => 
      p.id === id 
        ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
        : p
    ));
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const lowStockProducts = products.filter(p => p.stock < 10 && p.stock > 0).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;

  return (
    <div className="products-container">
      <div className="products-header">
        <div className="header-content">
          <h1>Gestión de Productos</h1>
          <p>Administra el catálogo completo de productos del restaurante</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <span className="btn-icon">➕</span>
          Nuevo Producto
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-box blue">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-number">{totalProducts}</div>
            <div className="stat-text">Total Productos</div>
          </div>
        </div>
        <div className="stat-box green">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-number">{activeProducts}</div>
            <div className="stat-text">Activos</div>
          </div>
        </div>
        <div className="stat-box orange">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <div className="stat-number">{lowStockProducts}</div>
            <div className="stat-text">Stock Bajo</div>
          </div>
        </div>
        <div className="stat-box red">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-number">{outOfStockProducts}</div>
            <div className="stat-text">Sin Stock</div>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar productos..."
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
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>
                  <div className="product-cell">
                    <span className="product-image">{product.image}</span>
                    <span className="product-name">{product.name}</span>
                  </div>
                </td>
                <td>
                  <span className="category-badge">{product.category}</span>
                </td>
                <td className="price-cell">${product.price.toFixed(2)}</td>
                <td>
                  <span className={`stock-badge ${product.stock < 10 ? 'low' : ''} ${product.stock === 0 ? 'out' : ''}`}>
                    {product.stock} unidades
                  </span>
                </td>
                <td>
                  <button
                    className={`status-toggle ${product.status}`}
                    onClick={() => handleToggleStatus(product.id)}
                  >
                    {product.status === 'active' ? '✓ Activo' : '✕ Inactivo'}
                  </button>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn edit"
                      onClick={() => handleOpenModal(product)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(product.id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No se encontraron productos</h3>
            <p>Intenta ajustar los filtros o agrega un nuevo producto</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label>Nombre del Producto</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Hamburguesa Clásica"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Emoji/Icono</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="🍔"
                    maxLength="2"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock (unidades)</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;