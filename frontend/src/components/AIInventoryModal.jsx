import React, { useState, useEffect, useMemo } from 'react';
import authService from '../services/api.js'; 
import '../styles/AIInventoryModal.css';
import { buildPurchaseOrder } from '../services/inventoryAI.service';

const AIInventoryModal = ({ isOpen, onClose }) => {
  // 1. DECLARACIÓN DE ESTADOS ADAPTADOS AL JSON REAL
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [iaData, setIaData] = useState({
    resumen_cards: { productos_activos: 0, stock_normal: 0, stock_bajo: 0, criticos: 0 },
    alertas_mermas: [],
    analisis_ia_texto: '',
    inventario_completo: []
  });

  const [quantities, setQuantities] = useState({});

  // 2. EFECTO PARA CARGAR LOS DATOS DESDE EL ENDPOINT REAL
  useEffect(() => {
    const cargarAnalisisIA = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await authService.getAIAnalytics(); 
        
        // Adaptamos la lectura al formato { success: true, data: { ... } }
        if (response && response.success && response.data) {
          const rawData = response.data;
          setIaData(rawData);

          // Inicializamos los inputs de la Orden de Compra con 0 para cada producto real
          const mapeoCantidades = {};
          rawData.inventario_completo?.forEach(item => {
            mapeoCantidades[item.id] = 0; 
          });
          setQuantities(mapeoCantidades);
        } else if (response && response.resumen_cards) {
          // Por si tu api.js ya extrae el .data de forma interna en los interceptores
          setIaData(response);
          const mapeoCantidades = {};
          response.inventario_completo?.forEach(item => {
            mapeoCantidades[item.id] = 0;
          });
          setQuantities(mapeoCantidades);
        }
      } catch (err) {
        console.error("Error al conectar con getAIAnalytics:", err);
        setError("No se pudo conectar con el servicio de IA. Verifica el endpoint en el backend.");
      } finally {
        setLoading(false);
      }
    };

    cargarAnalisisIA();
  }, [isOpen]);

  // 3. MANEJADOR PARA LOS INPUTS DE LA TABLA DE COMPRAS
  const handleQuantityChange = (id, value) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, parseInt(value) || 0)
    }));
  };

  // 4. MAPEO DE LAS TARJETAS DE RESUMEN (Usa directamente los conteos del Backend)
  const summaryCards = useMemo(() => {
    const cards = iaData.resumen_cards;
    return [
      { value: cards?.productos_activos || 0, label: 'Insumos Totales', type: 'normal' },
      { value: cards?.stock_normal || 0, label: 'Stock Estable', type: 'success' },
      { value: cards?.stock_bajo || 0, label: 'Stock Bajo', type: 'alert' },
      { value: cards?.criticos || 0, label: 'Críticos (<=2 días)', type: 'critical' },
    ];
  }, [iaData.resumen_cards]);

  // 5. DATOS DEL GRÁFICO ESTÉTICO (Simulado)
  const consumptionData = [
    { day: 'Lun', value: 89, height: 75 },
    { day: 'Mar', value: 134, height: 92 },
    { day: 'Mié', value: 78, height: 65 },
    { day: 'Jue', value: 112, height: 88 },
    { day: 'Vie', value: 156, height: 100 },
    { day: 'Sáb', value: 142, height: 95 },
    { day: 'Dom', value: 67, height: 58 },
  ];

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal-container">
        
        {/* HEADER */}
        <div className="ai-modal-header">
          <div className="ai-modal-title-section">
            <div className="ai-modal-icon">⚡</div>
            <div className="ai-modal-title-text">
              <h1>Análisis de Inventario Inteligente</h1>
              <p>Módulo de analítica predictiva impulsado por Groq AI</p>
            </div>
          </div>
          <button className="ai-modal-close" onClick={onClose}>×</button>
        </div>

        {/* MANEJO DE ESTADOS */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="ai-loading-spinner" style={{ fontSize: '32px', marginBottom: '15px', animation: 'spin 2s linear infinite' }}>🧠⚡</div>
            <p style={{ fontWeight: '600', color: '#1e1b4b' }}>Groq AI procesando inventario...</p>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Cruzando recetas, historial de ventas de 7 días y márgenes de merma.</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#dc2626' }}>
            <p style={{ fontSize: '24px' }}>⚠️</p>
            <p style={{ fontWeight: 'bold' }}>{error}</p>
            <button className="ai-btn-secondary" style={{ marginTop: '15px' }} onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <div className="ai-modal-content">
            
            {/* TABS NAVEGABLES */}
            <div className="ai-tabs-container">
              <button className={`ai-tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Resumen</button>
              <button className={`ai-tab-button ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>⚠️ Alertas ({iaData.alertas_mermas?.length || 0})</button>
              <button className={`ai-tab-button ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>🛒 Orden de Compra ({iaData.inventario_completo?.length || 0})</button>
              <button className={`ai-tab-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>💡 Insights de IA</button>
            </div>

            {/* TAB 1: RESUMEN */}
            {activeTab === 'overview' && (
              <div className="ai-tab-content">
                <div className="ai-summary-grid">
                  {summaryCards.map((item, idx) => (
                    <div key={idx} className={`ai-summary-card ${item.type}`}>
                      <div className="ai-summary-value">{item.value}</div>
                      <div className="ai-summary-label">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="ai-section-title">Fluctuación de consumo semanal (Últimos 7 días)</div>
                <div className="ai-chart-container">
                  {consumptionData.map((item, idx) => (
                    <div key={idx} className="ai-chart-bar" style={{ height: `${item.height}%` }}>
                      <div className="ai-chart-bar-value">{item.value} un</div>
                      <div className="ai-chart-bar-label">{item.day}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: ALERTAS DE MERMAS REALES */}
            {activeTab === 'alerts' && (
              <div className="ai-tab-content">
                <div className="ai-section-title">Insumos Críticos o con Riesgo de Vencimiento</div>
                {iaData.alertas_mermas?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#059669', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    ✨ ¡Excelente! No se detectaron alertas críticas de mermas ni sobreabastecimiento estancado.
                  </div>
                ) : (
                  iaData.alertas_mermas?.map((alert, idx) => (
                    <div key={idx} className="ai-alert-item critical">
                      <div className="ai-alert-icon">⚠️</div>
                      <div className="ai-alert-content">
                        <div className="ai-alert-title">{alert.producto}</div>
                        <div className="ai-alert-desc">{alert.mensaje}</div>
                        <div className="ai-alert-meta">SKU: {alert.sku} | Categoría: {alert.categoria}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: ORDEN DE COMPRA (TABLA CON INVENTARIO COMPLETO) */}
            {activeTab === 'recommendations' && (
              <div className="ai-tab-content">
                <div className="ai-section-title">Generador de Pedido Automatizado</div>
                <div className="ai-recommendations-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Materia Prima</th>
                        <th>Stock Físico</th>
                        <th>Consumo Promedio</th>
                        <th>Rotación Esperada</th>
                        <th>Cantidad a Solicitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iaData.inventario_completo?.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="ai-product-name">{item.nombre}</div>
                            <div className="ai-product-sku">Categoría: {item.categoria}</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>
                              {item.stock_actual}
                            </span>
                          </td>
                          <td style={{ color: '#475569', fontSize: '13px' }}>
                            {item.consumo_diario}
                          </td>
                          <td>
                            <span className={`ai-badge ${item.dias_restantes === 'Sin rotación' ? 'neutral' : 'active'}`}>
                              {item.dias_restantes === 'Sin rotación' ? item.dias_restantes : `${item.dias_restantes} días`}
                            </span>
                          </td>
                          <td>
                            <div className="ai-qty-input-group">
                              <input
                                type="number"
                                min="0"
                                value={quantities[item.id] || 0}
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                className="ai-qty-input"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: DIAGNÓSTICO DE LA IA (TEXTO COMPLETO REDACTADO POR GROQ) */}
            {activeTab === 'analytics' && (
              <div className="ai-tab-content">
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f5f3ff 0%, #f3e8ff 100%)', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6b21a8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧠</span> Informe Gerencial de Llama-3.3
                  </div>
                  <div 
                    style={{ fontSize: '14px', color: '#4c1d95', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: 'inherit' }}
                    className="ai-markdown-text"
                  >
                    {iaData.analisis_ia_texto || "El motor de inteligencia artificial no generó texto para este reporte."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="ai-modal-footer">
          <button className="ai-btn-secondary" onClick={onClose}>Cerrar</button>
          <button 
            className="ai-btn-primary" 
            disabled={loading || error || iaData.inventario_completo?.length === 0} 
            onClick={() => {
              const productosAComprar = buildPurchaseOrder(
              quantities,
              iaData.inventario_completo || []
              );

              console.log(
              "Ordenes de compra estructuradas:",
              productosAComprar
            );

            alert(
              `¡Éxito! Se generaron ${productosAComprar.length} productos para compra.`
            );
}}
          >
            ✓ Enviar a Orden de Compra
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInventoryModal;