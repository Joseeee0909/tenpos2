import React, { useState, useEffect } from 'react';
import authService from '../services/api';
import '../styles/pedido.css';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterEstado, setFilterEstado] = useState('todos');

  const [formData, setFormData] = useState({
    mesa: '',
    estado: 'pendiente',
    productos: []
  });

  const [currentProduct, setCurrentProduct] = useState({
    productoId: '',
    cantidad: 1
  });

  const estadoOptions = ['pendiente', 'preparando', 'listo', 'entregado'];
  const estados = ['todos', 'pendiente', 'preparando', 'listo', 'entregado'];

  useEffect(() => {
    Promise.all([
      fetchPedidos(),
      fetchMesas(),
      fetchProductos()
    ]);
  }, []);

  const fetchPedidos = async () => {
    try {
      const data = await authService.getPedidos();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching pedidos:', err);
      setPedidos([]);
    }
  };

  const fetchMesas = async () => {
    try {
      const data = await authService.getMesas();
      setMesas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching mesas:', err);
      setMesas([]);
    }
  };

  const fetchProductos = async () => {
    try {
      const data = await authService.getProducts();
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching productos:', err);
      setProductos([]);
    }
  };

  const handleAddProduct = () => {
    if (!currentProduct.productoId) {
      alert('Seleccione un producto');
      return;
    }

    const producto = productos.find(p => p._id === currentProduct.productoId);
    if (!producto) {
      alert('Producto no encontrado');
      return;
    }

    setFormData(prev => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          productoId: producto._id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: currentProduct.cantidad
        }
      ]
    }));

    setCurrentProduct({ productoId: '', cantidad: 1 });
  };

  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  };

  const handleCreatePedido = async () => {
    if (!formData.mesa) {
      alert('Seleccione una mesa');
      return;
    }

    if (formData.productos.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }

    try {
      const total = calculateTotal();
      await authService.crearPedido({
        mesa: formData.mesa,
        estado: formData.estado,
        productos: formData.productos,
        total
      });

      // Actualizar mesa a ocupada
      const mesa = mesas.find(m => m.numero == formData.mesa);
      if (mesa) {
        await authService.actualizarMesa(mesa._id, { estado: 'ocupada' });
      }

      setFormData({ mesa: '', estado: 'pendiente', productos: [] });
      setShowModal(false);
      fetchPedidos();
      fetchMesas();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateEstado = async (id, nuevoEstado) => {
    try {
      await authService.actualizarPedido(id, { estado: nuevoEstado });
      fetchPedidos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeletePedido = async (id, mesaNumero) => {
    if (window.confirm('¿Está seguro de que desea eliminar este pedido?')) {
      try {
        await authService.eliminarPedido(id);

        // Liberar mesa
        const mesa = mesas.find(m => m.numero == mesaNumero);
        if (mesa) {
          await authService.actualizarMesa(mesa._id, { estado: 'disponible' });
        }

        fetchPedidos();
        fetchMesas();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const getFilteredPedidos = () => {
    if (filterEstado === 'todos') return pedidos;
    return pedidos.filter(p => p.estado === filterEstado);
  };

  const pedidosFiltrados = getFilteredPedidos();

  return (
    <div className="pedidos-container">
      <div className="pedidos-header">
        <h1>Gestión de Pedidos</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormData({ mesa: '', estado: 'pendiente', productos: [] });
            setShowModal(true);
          }}
        >
          + Nuevo Pedido
        </button>
      </div>

      <div className="filter-section">
        <label>Filtrar por estado:</label>
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          {estados.map(est => (
            <option key={est} value={est}>
              {est.charAt(0).toUpperCase() + est.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="pedidos-list">
        {pedidosFiltrados.length === 0 ? (
          <p className="no-data">No hay pedidos</p>
        ) : (
          pedidosFiltrados.map(pedido => (
            <div key={pedido._id} className={`pedido-card estado-${pedido.estado}`}>
              <div className="pedido-header">
                <div>
                  <h3>Mesa {pedido.mesa}</h3>
                  <p className="pedido-fecha">
                    {new Date(pedido.fecha).toLocaleDateString()} {new Date(pedido.fecha).toLocaleTimeString()}
                  </p>
                </div>
                <span className={`estado-badge ${pedido.estado}`}>
                  {pedido.estado.toUpperCase()}
                </span>
              </div>

              <div className="pedido-productos">
                <h4>Productos:</h4>
                {pedido.productos && pedido.productos.map((prod, idx) => (
                  <div key={idx} className="producto-item">
                    <span>{prod.nombre || 'Producto'}</span>
                    <span>x{prod.cantidad}</span>
                    <span className="precio">${(prod.precio * prod.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pedido-total">
                <strong>Total: ${pedido.total ? pedido.total.toFixed(2) : '0.00'}</strong>
              </div>

              <div className="pedido-actions">
                <select
                  value={pedido.estado}
                  onChange={(e) => handleUpdateEstado(pedido._id, e.target.value)}
                  className="select-estado"
                >
                  {estadoOptions.map(est => (
                    <option key={est} value={est}>
                      {est.charAt(0).toUpperCase() + est.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeletePedido(pedido._id, pedido.mesa)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Nuevo Pedido</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Mesa *</label>
                <select
                  value={formData.mesa}
                  onChange={(e) => setFormData(prev => ({ ...prev, mesa: e.target.value }))}
                >
                  <option value="">Seleccione una mesa</option>
                  {mesas.map(mesa => (
                    <option key={mesa._id} value={mesa.numero}>
                      Mesa {mesa.numero} - {mesa.estado}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Estado Inicial</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                >
                  {estadoOptions.map(est => (
                    <option key={est} value={est}>
                      {est.charAt(0).toUpperCase() + est.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Agregar Productos *</label>
                <div className="product-input">
                  <select
                    value={currentProduct.productoId}
                    onChange={(e) => setCurrentProduct(prev => ({
                      ...prev,
                      productoId: e.target.value
                    }))}
                  >
                    <option value="">Seleccione un producto</option>
                    {productos.map(prod => (
                      <option key={prod._id} value={prod._id}>
                        {prod.nombre} - ${prod.precio}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={currentProduct.cantidad}
                    onChange={(e) => setCurrentProduct(prev => ({
                      ...prev,
                      cantidad: parseInt(e.target.value)
                    }))}
                    placeholder="Cantidad"
                  />
                  <button className="btn btn-sm btn-primary" onClick={handleAddProduct}>
                    Agregar
                  </button>
                </div>
              </div>

              {formData.productos.length > 0 && (
                <div className="productos-agregados">
                  <h4>Productos en el Pedido:</h4>
                  {formData.productos.map((prod, idx) => (
                    <div key={idx} className="producto-agregado">
                      <span>
                        {prod.nombre} x{prod.cantidad} = ${(prod.precio * prod.cantidad).toFixed(2)}
                      </span>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemoveProduct(idx)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  <div className="total-modal">
                    <strong>Total: ${calculateTotal().toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreatePedido}
              >
                Crear Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
