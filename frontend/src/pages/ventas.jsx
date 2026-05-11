import { useEffect, useMemo, useState } from 'react';
import authService from '../services/api';
import { UxToast } from '../components/UXFeedback';
import '../styles/ventas.css';

const toCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('es-CO')}`;

const formatDate = (value) => {
  const date = new Date(value || Date.now());
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (value) => {
  const date = new Date(value || Date.now());
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

const STATUS_LABEL = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  reembolsada: 'Reembolsada'
};

const STATUS_STYLE = {
  completada: 'completed',
  pendiente: 'pending',
  reembolsada: 'refunded'
};

const normalizeCliente = (cliente) => {
  if (!cliente) return { nombre: 'Consumidor Final', documento: '' };
  if (typeof cliente === 'string') return { nombre: cliente, documento: '' };
  if (typeof cliente === 'object') {
    return {
      nombre: cliente.nombre || 'Consumidor Final',
      documento: cliente.documento || ''
    };
  }
  return { nombre: String(cliente), documento: '' };
};

export default function VentasPage() {
  const [sales, setSales] = useState([]);
  const [notice, setNotice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const loadSales = async () => {
    try {
      const data = await authService.getVentas();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      pushNotice('No se pudieron cargar las ventas.', 'error');
      setSales([]);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const normalizedSales = useMemo(() => {
    return sales.map((sale) => {
      const items = Array.isArray(sale.items)
        ? sale.items
        : (Array.isArray(sale.productos) ? sale.productos : []);
      const itemCount = items.reduce((sum, i) => sum + Number(i.cantidad || 0), 0);
      const cliente = normalizeCliente(sale.cliente);
      const meseroNombre = sale.mesero?.nombre || sale.mesero?.username || '';
      return {
        _id: sale._id,
        numero: sale.numero || `#${String(sale._id || '').slice(-4).toUpperCase()}`,
        fecha: sale.fecha,
        mesa: sale.mesa,
        cliente: cliente.nombre,
        clienteDocumento: cliente.documento,
        mesero: meseroNombre,
        items,
        itemCount,
        total: Number(sale.total || 0),
        subtotal: Number(sale.subtotal || 0),
        iva: Number(sale.ivaTotal ?? sale.iva ?? 0),
        propina: Number(sale.propina || 0),
        metodoPago: sale.metodoPago || 'Efectivo',
        estado: String(sale.estado || 'completada').toLowerCase()
      };
    });
  }, [sales]);

  const filteredSales = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return normalizedSales.filter((sale) => {
      const byStatus = statusFilter === 'all' || sale.estado === statusFilter;
      const bySearch =
        !q ||
        sale.numero.toLowerCase().includes(q) ||
        String(sale.mesa || '').includes(q) ||
        String(sale.cliente || '').toLowerCase().includes(q);

      const saleDate = new Date(sale.fecha || Date.now());
      const byDate =
        (!fromDate || saleDate >= fromDate) &&
        (!toDate || saleDate <= toDate);

      return byStatus && bySearch && byDate;
    });
  }, [normalizedSales, searchTerm, statusFilter, dateFrom, dateTo]);

  const sortedSales = useMemo(() => {
    const sorted = [...filteredSales];
    sorted.sort((a, b) => {
      if (sortBy === 'date-asc') return new Date(a.fecha) - new Date(b.fecha);
      if (sortBy === 'amount-desc') return b.total - a.total;
      if (sortBy === 'amount-asc') return a.total - b.total;
      return new Date(b.fecha) - new Date(a.fecha);
    });
    return sorted;
  }, [filteredSales, sortBy]);

  const stats = useMemo(() => {
    const completadas = normalizedSales.filter((sale) => sale.estado === 'completada');
    const reembolsadas = normalizedSales.filter((sale) => sale.estado === 'reembolsada');
    const totalVentas = completadas.reduce((sum, sale) => sum + sale.total, 0);
    const ticketPromedio = completadas.length ? totalVentas / completadas.length : 0;

    return {
      totalVentas,
      completadas: completadas.length,
      reembolsadas: reembolsadas.length,
      ticketPromedio
    };
  }, [normalizedSales]);

  const exportData = () => {
    if (!sortedSales.length) {
      pushNotice('No hay datos para exportar.', 'warning');
      return;
    }

    const rows = [
      ['Venta', 'Fecha', 'Hora', 'Mesa', 'Cliente', 'Items', 'Total', 'Metodo Pago', 'Estado']
    ];

    sortedSales.forEach((sale) => {
      rows.push([
        sale.numero,
        formatDate(sale.fecha),
        formatTime(sale.fecha),
        String(sale.mesa || ''),
        sale.cliente,
        String(sale.itemCount),
        String(sale.total),
        sale.metodoPago,
        STATUS_LABEL[sale.estado] || sale.estado
      ]);
    });

    const csvContent = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openDetail = (sale) => setSelected(sale);
  const closeDetail = () => setSelected(null);

  const openFacturaPdf = (numero) => {
    if (!numero) {
      pushNotice('No hay numero de factura disponible.', 'warning');
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.open(`${baseUrl}/facturas/${numero}/pdf`, '_blank', 'noopener');
  };

  return (
    <div className="sales-page">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <div className="section-label">Historial y reportes</div>

      <div className="page-header">
        <div className="header-left">
          <div className="ph-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="header-text">
            <h1>Historial de Ventas</h1>
            <p>Visualiza todas tus transacciones completadas</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="date-range">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4V1z" />
            </svg>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span style={{ color: '#94a3b8' }}>hasta</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="export-btn" type="button" onClick={exportData}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1v10M3 7l5 5 5-5M2 14h12" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Ventas</div>
            <div className="stat-value">{toCurrency(stats.totalVentas)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Ventas Completadas</div>
            <div className="stat-value">{stats.completadas}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon refund">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 105.199 5.1H7a1 1 0 000-2H4a1 1 0 00-1 1z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Devoluciones</div>
            <div className="stat-value">{stats.reembolsadas}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon average">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Ticket Promedio</div>
            <div className="stat-value">{toCurrency(stats.ticketPromedio)}</div>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M10.5 10.5l4 4" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por numero de venta, cliente o mesa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-row">
          <div className="filter-buttons">
            {[
              { key: 'all', label: `Todos (${normalizedSales.length})` },
              { key: 'completada', label: `Completadas (${stats.completadas})`, dot: 'completed' },
              { key: 'pendiente', label: `Pendientes (${normalizedSales.filter((s) => s.estado === 'pendiente').length})`, dot: 'pending' },
              { key: 'reembolsada', label: `Reembolsadas (${stats.reembolsadas})`, dot: 'refunded' }
            ].map((btn) => (
              <button
                key={btn.key}
                className={`filter-btn${statusFilter === btn.key ? ' active' : ''}`}
                type="button"
                onClick={() => setStatusFilter(btn.key)}
              >
                {btn.dot ? <span className={`status-dot ${btn.dot}`}></span> : null}
                {btn.label}
              </button>
            ))}
          </div>
          <div className="sort-control">
            <label>Ordenar por:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date-desc">Mas reciente</option>
              <option value="date-asc">Mas antiguo</option>
              <option value="amount-desc">Mayor monto</option>
              <option value="amount-asc">Menor monto</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div>Venta #</div>
          <div>Fecha y Hora</div>
          <div>Cliente/Mesa</div>
          <div>Productos</div>
          <div>Monto Total</div>
          <div>Metodo Pago</div>
          <div>Estado</div>
          <div>Acciones</div>
        </div>
        <div className="table-body">
          {!sortedSales.length ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="8" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              <p>No hay ventas para mostrar</p>
            </div>
          ) : (
            sortedSales.map((sale) => (
              <div key={sale._id} className="table-row">
                <div className="cell-id">
                  <svg viewBox="0 0 20 20" fill="#6366f1" style={{ width: 16, height: 16 }}>
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2h12a1 1 0 100-2 2 2 0 00-2 2v10a2 2 0 002 2 1 1 0 100 2h-4.586a1 1 0 00-.707.293l-2.414-2.414a2 2 0 00-2.828 0l-2.414 2.414A1 1 0 002 17h4a2 2 0 002-2V5z" />
                  </svg>
                  <div className="cell-id-stack">
                    <div className="cell-id-number">{sale.numero}</div>
                    <div className="cell-id-sub">Venta</div>
                  </div>
                </div>
                <div>
                  <div className="cell-date">{formatDate(sale.fecha)}</div>
                  <div className="cell-time">{formatTime(sale.fecha)}</div>
                </div>
                <div>
                  <div className="client-name">{sale.cliente || 'Mesa'}</div>
                  <div className="client-table">Mesa {sale.mesa || '-'}</div>
                </div>
                <div className="cell-items">
                  <span>{sale.itemCount} productos</span>
                </div>
                <div className="cell-amount">{toCurrency(sale.total)}</div>
                <div className="cell-payment">
                  <div className="payment-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                    </svg>
                  </div>
                  {sale.metodoPago}
                </div>
                <div>
                  <span className={`status-badge ${STATUS_STYLE[sale.estado] || 'completed'}`}>
                    <span className={`status-dot ${STATUS_STYLE[sale.estado] || 'completed'}`}></span>
                    {STATUS_LABEL[sale.estado] || sale.estado}
                  </span>
                </div>
                <div className="cell-actions">
                  <button className="action-btn-small" type="button" onClick={() => openDetail(sale)} title="Ver detalles">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="6" />
                      <circle cx="8" cy="8" r="2" />
                    </svg>
                  </button>
                  <button className="action-btn-small" type="button" onClick={() => openFacturaPdf(sale.numero)} title="Imprimir">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4V2h8v2M4 10H2V5h12v5h-2M4 10h8v2H4v-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`modal-overlay${selected ? ' show' : ''}`} onClick={(e) => {
        if (e.target.classList.contains('modal-overlay')) closeDetail();
      }}>
        {selected && (
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2h12a1 1 0 100-2 2 2 0 00-2 2v10a2 2 0 002 2 1 1 0 100 2h-4.586a1 1 0 00-.707.293l-2.414-2.414a2 2 0 00-2.828 0l-2.414 2.414A1 1 0 002 17h4a2 2 0 002-2V5z" />
                </svg>
                Detalles de la Venta
              </div>
              <button className="modal-close" type="button" onClick={closeDetail}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <span className="detail-label">Informacion General</span>
                <div className="detail-grid">
                  <div>
                    <div className="detail-label">Numero de Venta</div>
                    <div className="detail-value">{selected.numero}</div>
                  </div>
                  <div>
                    <div className="detail-label">Fecha y Hora</div>
                    <div className="detail-value">{formatDate(selected.fecha)} - {formatTime(selected.fecha)}</div>
                  </div>
                  <div>
                    <div className="detail-label">Cliente</div>
                    <div className="detail-value">{selected.cliente || 'Consumidor Final'}</div>
                  </div>
                  <div>
                    <div className="detail-label">Documento</div>
                    <div className="detail-value">{selected.clienteDocumento || '000000'}</div>
                  </div>
                  <div>
                    <div className="detail-label">Mesa</div>
                    <div className="detail-value">{selected.mesa || '-'}</div>
                  </div>
                  <div>
                    <div className="detail-label">Mesero</div>
                    <div className="detail-value">{selected.mesero || 'Sin asignar'}</div>
                  </div>
                  <div>
                    <div className="detail-label">Estado</div>
                    <div className="detail-value">
                      <span className={`status-badge ${STATUS_STYLE[selected.estado] || 'completed'}`}>
                        <span className={`status-dot ${STATUS_STYLE[selected.estado] || 'completed'}`}></span>
                        {STATUS_LABEL[selected.estado] || selected.estado}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-group">
                <span className="detail-label">Productos</span>
                <table className="detail-items-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item, index) => (
                      <tr key={`${item.productoId || item.nombre}-${index}`}>
                        <td>{item.nombre}</td>
                        <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>{toCurrency(item.precio)}</td>
                        <td style={{ textAlign: 'right' }}>{toCurrency(Number(item.precio || 0) * Number(item.cantidad || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="detail-group">
                <span className="detail-label">Desglose de Pago</span>
                <div className="detail-breakdown">
                  <div className="detail-row">
                    <span>Subtotal:</span>
                    <span className="detail-amount">{toCurrency(selected.subtotal)}</span>
                  </div>
                  <div className="detail-row">
                    <span>IVA:</span>
                    <span className="detail-amount">{toCurrency(selected.iva)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Propina:</span>
                    <span className="detail-amount">{toCurrency(selected.propina)}</span>
                  </div>
                  <div className="detail-row total">
                    <span>Total:</span>
                    <span className="detail-amount">{toCurrency(selected.total)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Metodo de Pago:</span>
                    <span className="detail-amount">{selected.metodoPago}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" onClick={closeDetail}>Cerrar</button>
              <button className="btn-modal primary" type="button" onClick={() => openFacturaPdf(selected?.numero)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4V2h8v2M4 10H2V5h12v5h-2M4 10h8v2H4v-2z" />
                </svg>
                Imprimir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
