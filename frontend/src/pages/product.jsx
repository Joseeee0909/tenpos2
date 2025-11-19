

import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save, RefreshCw, AlertCircle } from 'lucide-react';
import authService from '../services/api.js';
import { AuthContext } from '../context/AuthContext';
import '../styles/product.css';

export default function ProductsCRUD() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentProduct, setCurrentProduct] = useState({
    id: null,
    code: '',
    name: '',
    category: '',
    price: '',
    stock: ''
  });

  // Usaremos axios instance desde authService; baseURL ya apunta a /api
  const axios = authService.axios;
  const { user } = useContext(AuthContext) || {};

  useEffect(() => {
    fetchProducts();
  }, []);

  // GET - Obtener todos los productos
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/products');
      // backend returns { productos: [...] }
      const data = res.data.productos || [];
      // map backend fields to frontend-friendly shape
      setProducts(data.map(p => ({
        id: p._id || p.id,
        code: p._id || p.code,
        name: p.nombre,
        category: p.categoria,
        price: p.precio,
        stock: p.stock,
        descripcion: p.descripcion
      })));
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('No se pudieron cargar los productos. Usando datos de ejemplo.');
    
    } finally {
      setLoading(false);
    }
  };

  // POST - Crear nuevo producto
  const createProduct = async (productData) => {
    setLoading(true);
    setError(null);
    try {
      // payload uses backend field names
      const payload = {
        nombre: productData.name,
        precio: productData.price,
        descripcion: productData.description || productData.name,
        categoria: productData.category,
        stock: productData.stock
      };
      const res = await axios.post('/products', payload);
      const newProduct = res.data.producto || res.data;
      const mapped = {
        id: newProduct._id || newProduct.id,
        code: newProduct._id || newProduct.code,
        name: newProduct.nombre,
        category: newProduct.categoria,
        price: newProduct.precio,
        stock: newProduct.stock,
        descripcion: newProduct.descripcion
      };
      setProducts([...products, mapped]);
      return true;
    } catch (err) {
      console.error('Error creating product:', err);
      setError('Error al crear el producto');
      const newProduct = {
        ...productData,
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1
      };
      setProducts([...products, newProduct]);
      return true;
    } finally {
      setLoading(false);
    }
  };

  // PUT - Actualizar producto existente
  const updateProduct = async (id, productData) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        nombre: productData.name,
        precio: productData.price,
        descripcion: productData.description || productData.name,
        categoria: productData.category,
        stock: productData.stock
      };
      const res = await axios.put(`/products/${id}`, payload);
      const updatedProduct = res.data.producto || res.data;
      const mapped = {
        id: updatedProduct._id || updatedProduct.id,
        code: updatedProduct._id || updatedProduct.code,
        name: updatedProduct.nombre,
        category: updatedProduct.categoria,
        price: updatedProduct.precio,
        stock: updatedProduct.stock,
        descripcion: updatedProduct.descripcion
      };
      setProducts(products.map(p => p.id === id ? mapped : p));
      return true;
    } catch (err) {
      console.error('Error updating product:', err);
      setError('Error al actualizar el producto');
      setProducts(products.map(p => p.id === id ? { ...productData, id } : p));
      return true;
    } finally {
      setLoading(false);
    }
  };

  // DELETE - Eliminar producto
  const deleteProduct = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Error al eliminar el producto');
      setProducts(products.filter(p => p.id !== id));
      return true;
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentProduct({
      id: null,
      code: '',
      name: '',
      category: '',
      price: '',
      stock: ''
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setCurrentProduct({ ...product });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!currentProduct.code || !currentProduct.name || !currentProduct.category || 
        !currentProduct.price || !currentProduct.stock) {
      alert('Por favor complete todos los campos');
      return;
    }

    const productData = {
      code: currentProduct.code,
      name: currentProduct.name,
      category: currentProduct.category,
      price: parseFloat(currentProduct.price),
      stock: parseInt(currentProduct.stock)
    };

    let success = false;
    if (modalMode === 'create') {
      success = await createProduct(productData);
    } else {
      success = await updateProduct(currentProduct.id, productData);
    }

    if (success) {
      setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      await deleteProduct(id);
    }
  };

  return (
    <div className="pos-container">
      <div className="pos-wrapper">
        {/* Header */}
        <div className="pos-header">
          <div className="header-top">
            <h1 className="header-title">Sistema POS - Gestión de Productos</h1>
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="btn btn-reload"
              title="Recargar productos"
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              Recargar
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-warning">
              <AlertCircle className="alert-icon" size={20} />
              <div className="alert-content">
                <p className="alert-text">{error}</p>
                <p className="alert-subtext">
                  Configura el API_URL en el código para conectar con tu backend
                </p>
              </div>
              <button onClick={() => setError(null)} className="alert-close">
                <X size={18} />
              </button>
            </div>
          )}
          
            <div className="header-actions">
            {/* Search Bar */}
            <div className="search-container">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Create Button - only for admins */}
            {user && ['administrador','admin','root'].includes(user.rol) && (
              <button
                onClick={openCreateModal}
                disabled={loading}
                className="btn btn-primary"
              >
                <Plus size={20} />
                Nuevo Producto
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Stock</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="loading-cell">
                    <RefreshCw className="spin loading-spinner" size={24} />
                    <p>Cargando productos...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="font-medium">{product.code}</td>
                    <td>{product.name}</td>
                    <td>
                      <span className="badge badge-category">
                        {product.category}
                      </span>
                    </td>
                    <td className="text-right font-semibold">
                      ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                    </td>
                    <td className="text-right">
                      <span className={`badge badge-stock ${
                        product.stock > 20 ? 'badge-stock-high' :
                        product.stock > 10 ? 'badge-stock-medium' :
                        'badge-stock-low'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <div className="actions-buttons">
                        {user && ['administrador','admin','root'].includes(user.rol) ? (
                          <>
                            <button
                              onClick={() => openEditModal(product)}
                              disabled={loading}
                              className="btn-icon btn-edit"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              disabled={loading}
                              className="btn-icon btn-delete"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <span style={{opacity: 0.6}}>No autorizado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Total Products */}
        <div className="products-count">
          Total de productos: <span className="count-number">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            {/* Modal Header */}
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'create' ? 'Crear Producto' : 'Editar Producto'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="modal-close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Código *</label>
                <input
                  type="text"
                  name="code"
                  value={currentProduct.code}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="form-input"
                  placeholder="Ej: P001"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  name="name"
                  value={currentProduct.name}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="form-input"
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría *</label>
                <input
                  type="text"
                  name="category"
                  value={currentProduct.category}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="form-input"
                  placeholder="Ej: Electrónica"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Precio *</label>
                  <input
                    type="number"
                    name="price"
                    value={currentProduct.price}
                    onChange={handleInputChange}
                    disabled={loading}
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    value={currentProduct.stock}
                    onChange={handleInputChange}
                    disabled={loading}
                    min="0"
                    className="form-input"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <RefreshCw size={18} className="spin" />
                ) : (
                  <Save size={18} />
                )}
                {modalMode === 'create' ? 'Crear' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
