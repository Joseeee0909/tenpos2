import React, { useState } from 'react';
import '../styles/AIInventoryModal.css';

const AIInventoryModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [recommendations, setRecommendations] = useState({
    'PROD-001': 150,
    'PROD-015': 200,
    'PROD-005': 120,
    'PROD-008': 100,
    'PROD-022': 80,
  });

  const summaryData = [
    { value: 47, label: 'Productos activos', type: 'normal' },
    { value: 23, label: 'Stock normal', type: 'success' },
    { value: 18, label: 'Stock bajo', type: 'alert' },
    { value: 6, label: 'Críticos', type: 'critical' },
  ];

  const alerts = [
    {
      type: 'critical',
      icon: '🔴',
      title: 'Bandeja Paisa - Stock crítico en 2 días',
      desc: 'La IA predice que este producto se agotará en ~48 horas basándose en el patrón de consumo actual. Consumo promedio: 45 unidades/día',
      meta: 'Confianza: 94% | Recomendación: Reabastecer de inmediato',
    },
    {
      type: 'critical',
      icon: '🔴',
      title: 'Cerveza Premium - Stock se agota en 1 día',
      desc: 'Predicción crítica: inventario insuficiente para la demanda del fin de semana. Stock actual: 12 unidades, necesario: 80+',
      meta: 'Confianza: 98% | Acción requerida: Reabastecer URGENTE',
    },
    {
      type: 'warning',
      icon: '🟠',
      title: 'Arepas con Queso - Stock bajo proyectado',
      desc: 'La IA detecta tendencia creciente de consumo. Si continúa, llegará a stock bajo en 4-5 días',
      meta: 'Confianza: 87% | Acción sugerida: Planificar reabastecimiento',
    },
    {
      type: 'warning',
      icon: '🟠',
      title: 'Patacones - Variabilidad en consumo',
      desc: 'Este producto muestra alta volatilidad en demanda. Consumo varía entre 20-85 unidades/día según el día de la semana',
      meta: 'Confianza: 76% | Recomendación: Mantener stock buffer adicional',
    },
    {
      type: 'info',
      icon: 'ℹ️',
      title: 'Jugo de Lulo - Oportunidad de optimización',
      desc: 'La IA detecta que este producto tiene demanda predecible y constante. Considera aumentar cantidad de pedido para obtener mejor precio',
      meta: 'Confianza: 82% | Beneficio potencial: Ahorro 12-15% en costo',
    },
  ];

  const recommendationsData = [
    {
      id: 'PROD-001',
      name: 'Bandeja Paisa',
      sku: 'PROD-001',
      consumption: { value: 315, unit: 'un', avg: 45 },
      stock: 18,
      recommended: 150,
      confidence: 94,
    },
    {
      id: 'PROD-015',
      name: 'Cerveza Premium',
      sku: 'PROD-015',
      consumption: { value: 480, unit: 'un', avg: 68 },
      stock: 12,
      recommended: 200,
      confidence: 98,
    },
    {
      id: 'PROD-005',
      name: 'Arepas con Queso',
      sku: 'PROD-005',
      consumption: { value: 245, unit: 'un', avg: 35 },
      stock: 42,
      recommended: 120,
      confidence: 87,
    },
    {
      id: 'PROD-008',
      name: 'Patacones',
      sku: 'PROD-008',
      consumption: { value: 280, unit: 'un', avg: 40 },
      stock: 56,
      recommended: 100,
      confidence: 76,
    },
    {
      id: 'PROD-022',
      name: 'Jugo de Lulo',
      sku: 'PROD-022',
      consumption: { value: 175, unit: 'un', avg: 25 },
      stock: 68,
      recommended: 80,
      confidence: 82,
    },
  ];

  const consumptionData = [
    { day: 'Lun', value: 89, height: 75 },
    { day: 'Mar', value: 134, height: 92 },
    { day: 'Mié', value: 78, height: 65 },
    { day: 'Jue', value: 112, height: 88 },
    { day: 'Vie', value: 156, height: 100 },
    { day: 'Sáb', value: 142, height: 95 },
    { day: 'Dom', value: 67, height: 58 },
  ];

  const analyticsStats = [
    {
      title: '📉 Productos en riesgo',
      metrics: [
        { label: 'Críticos (0-2 días)', value: '6 productos', color: '#dc2626' },
        { label: 'Alerta (3-5 días)', value: '12 productos', color: '#f59e0b' },
        { label: 'Monitoreo (6-10 días)', value: '18 productos', color: '#0891b2' },
      ],
    },
    {
      title: '📊 Consumo y tendencias',
      metrics: [
        { label: 'Consumo promedio/día', value: '892 un' },
        { label: 'Día pico (últimos 7d)', value: 'Viernes: 1,240 un' },
        { label: 'Día mínimo (últimos 7d)', value: 'Domingo: 578 un' },
      ],
    },
    {
      title: '💰 Impacto financiero',
      metrics: [
        { label: 'Valor actual en stock', value: '$2,847,500' },
        { label: 'Inversión recomendada', value: '$1,245,000', color: '#059669' },
        { label: 'Ahorros potenciales', value: '$156,800', color: '#059669' },
      ],
    },
    {
      title: '🎯 Precisión del modelo',
      metrics: [
        { label: 'Exactitud (últimos 30d)', value: '92.4%', color: '#059669' },
        { label: 'Entrenamientos completados', value: '847' },
        { label: 'Datos procesados', value: '18,450 registros' },
      ],
    },
  ];

  const handleRecommendationChange = (id, newValue) => {
    setRecommendations({
      ...recommendations,
      [id]: parseInt(newValue) || 0,
    });
  };

  const getStockStatusClass = (stock) => {
    if (stock <= 20) return 'critical';
    if (stock <= 50) return 'alert';
    return 'normal';
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal-container">
        {/* HEADER */}
        <div className="ai-modal-header">
          <div className="ai-modal-title-section">
            <div className="ai-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="ai-modal-title-text">
              <h1>Análisis de Inventario</h1>
              <p>Predicciones y recomendaciones inteligentes</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="ai-modal-ia-badge">🤖 Powered by IA</div>
            <button className="ai-modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="ai-modal-content">
          {/* TABS */}
          <div className="ai-tabs-container">
            <button
              className={`ai-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Resumen
            </button>
            <button
              className={`ai-tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              ⚠️ Alertas
            </button>
            <button
              className={`ai-tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              🛒 Reabastecimiento
            </button>
            <button
              className={`ai-tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Análisis
            </button>
          </div>

          {/* TAB: RESUMEN */}
          {activeTab === 'overview' && (
            <div className="ai-tab-content">
              <div className="ai-summary-grid">
                {summaryData.map((item, idx) => (
                  <div key={idx} className={`ai-summary-card ${item.type}`}>
                    <div className="ai-summary-value">{item.value}</div>
                    <div className="ai-summary-label">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="ai-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="2" x2="12" y2="22"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h.5M6.5 15H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-3.5"/>
                </svg>
                Consumo promedio (últimos 7 días)
              </div>

              <div className="ai-chart-container">
                {consumptionData.map((item, idx) => (
                  <div key={idx} className="ai-chart-bar" style={{ height: `${item.height}%` }}>
                    <div className="ai-chart-bar-value">{item.value}</div>
                    <div className="ai-chart-bar-label">{item.day}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ALERTAS */}
          {activeTab === 'alerts' && (
            <div className="ai-tab-content">
              <div className="ai-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <circle cx="12" cy="17" r=".5" fill="currentColor"/>
                </svg>
                Alertas predictivas de la IA
              </div>

              {alerts.map((alert, idx) => (
                <div key={idx} className={`ai-alert-item ${alert.type}`}>
                  <div className="ai-alert-icon">{alert.icon}</div>
                  <div className="ai-alert-content">
                    <div className="ai-alert-title">{alert.title}</div>
                    <div className="ai-alert-desc">{alert.desc}</div>
                    <div className="ai-alert-meta">{alert.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: RECOMENDACIONES */}
          {activeTab === 'recommendations' && (
            <div className="ai-tab-content">
              <div className="ai-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
                Sugerencias de reabastecimiento
              </div>

              <div className="ai-recommendations-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Producto</th>
                      <th style={{ width: '20%' }}>Consumo (7d)</th>
                      <th style={{ width: '15%' }}>Stock actual</th>
                      <th style={{ width: '15%' }}>Cantidad sugerida</th>
                      <th style={{ width: '15%' }}>Confianza IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendationsData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="ai-product-name">{item.name}</div>
                          <div className="ai-product-sku">SKU: {item.sku}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>
                            {item.consumption.value} {item.consumption.unit}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {item.consumption.avg} un/día promedio
                          </div>
                        </td>
                        <td>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: item.stock <= 20 ? '#dc2626' : item.stock <= 50 ? '#f59e0b' : '#1a1a2e'
                          }}>
                            {item.stock} un
                          </div>
                        </td>
                        <td>
                          <div className="ai-qty-input-group">
                            <input
                              type="number"
                              value={recommendations[item.id]}
                              onChange={(e) => handleRecommendationChange(item.id, e.target.value)}
                              className="ai-qty-input"
                            />
                            <span style={{ color: '#0891b2', fontWeight: '700' }}>un</span>
                          </div>
                        </td>
                        <td>
                          <div className="ai-confidence-badge">{item.confidence}%</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ANÁLISIS */}
          {activeTab === 'analytics' && (
            <div className="ai-tab-content">
              <div className="ai-stats-grid">
                {analyticsStats.map((stat, idx) => (
                  <div key={idx} className="ai-stat-box">
                    <div className="ai-stat-box-title">{stat.title}</div>
                    {stat.metrics.map((metric, midx) => (
                      <div key={midx} className="ai-metric-item">
                        <span className="ai-metric-label">{metric.label}</span>
                        <span className="ai-metric-value" style={{ color: metric.color || '#1a1a2e' }}>
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'linear-gradient(135deg,#f0f9fb 0%,#ecfdf5 100%)',
                borderRadius: '12px',
                border: '1.5px solid #bae6fd'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', marginBottom: '10px' }}>
                  💡 Insight de IA
                </div>
                <div style={{ fontSize: '12px', color: '#075985', lineHeight: '1.6' }}>
                  La IA detecta que los productos de la categoría "Bebidas" tienen un patrón de consumo estrechamente correlacionado con los días de la semana. Los viernes y sábados muestran picos del 110-140% sobre el promedio. Se recomienda ajustar el modelo de compra a este patrón estacional para optimizar inventario y reducir roturas de stock en fin de semana.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="ai-modal-footer">
          <button className="ai-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="ai-btn-secondary" onClick={() => alert('Exportando reporte...')}>
            📥 Exportar reporte
          </button>
          <button className="ai-btn-primary" onClick={() => alert('Recomendaciones aplicadas. Órdenes creadas.')}>
            ✓ Aplicar recomendaciones
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInventoryModal;
