import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/api';
import { UxToast } from '../components/UXFeedback';
import { getStoredSettings } from '../utils/settings';
import '../styles/checkout.css';

const ACTIVE_STATES = new Set(['pendiente', 'preparando', 'listo', 'entregado']);

const toCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('es-CO')}`;

const buildTotals = (sum, taxSettings) => {
  const base = Math.round(Number(sum || 0));
  const vatRate = taxSettings.applyVat ? taxSettings.vatPercent / 100 : 0;

  if (!vatRate) {
    return { subtotal: base, tax: 0, total: base };
  }

  if (taxSettings.pricesIncludeVat) {
    const subtotal = Math.round(base / (1 + vatRate));
    let tax = Math.round(subtotal * vatRate);
    const correction = base - (subtotal + tax);
    if (correction !== 0) tax += correction;
    return { subtotal, tax, total: base };
  }

  const subtotal = base;
  const tax = Math.round(subtotal * vatRate);
  return { subtotal, tax, total: subtotal + tax };
};

const readTaxSettings = () => {
  const stored = getStoredSettings();
  return {
    vatPercent: Number(stored.vatPercent ?? 19),
    applyVat: stored.applyVat !== false,
    pricesIncludeVat: stored.pricesIncludeVat !== false
  };
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mesaParam = params.get('mesa');
  const mesaNumero = Number(mesaParam || 0);

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState(null);
  const [taxSettings, setTaxSettings] = useState(readTaxSettings());
  const [appSettings, setAppSettings] = useState(getStoredSettings());

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [includeTip, setIncludeTip] = useState(false);
  const [tipPercent, setTipPercent] = useState(10);
  const [discountValue, setDiscountValue] = useState('');
  const [modals, setModals] = useState({
    split: false,
    edit: false,
    print: false,
    delete: false,
    complete: false,
    success: false
  });
  const [lastFactura, setLastFactura] = useState(null);

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const handleSettings = () => {
      setTaxSettings(readTaxSettings());
      const stored = getStoredSettings();
      setAppSettings(stored);
      setTipPercent(Number(stored.tipPercent ?? 10));
      setIncludeTip(Boolean(stored.tipSuggested));
    };
    const handleStorage = (event) => {
      if (event.key === 'app_settings') handleSettings();
    };
    handleSettings();
    window.addEventListener('app-settings-updated', handleSettings);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('app-settings-updated', handleSettings);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const loadPedido = async () => {
    if (!mesaNumero) {
      pushNotice('Mesa no valida para cobrar.', 'warning');
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getPedidos();
      const pedidos = Array.isArray(data) ? data : [];
      const candidates = pedidos
        .filter((p) => Number(p.mesa) === mesaNumero)
        .filter((p) => ACTIVE_STATES.has(String(p.estado || '').toLowerCase()))
        .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

      setPedido(candidates[0] || null);
    } catch (error) {
      console.error('Error cargando pedido:', error);
      pushNotice('No se pudo cargar el pedido para esta mesa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPedido();
  }, [mesaNumero]);

  const items = useMemo(() => {
    if (!pedido?.productos) return [];
    return pedido.productos.map((item) => ({
      nombre: item?.nombre || 'Producto',
      cantidad: Number(item?.cantidad || 1),
      precio: Number(item?.precio || 0),
      obs: item?.obs || ''
    }));
  }, [pedido]);

  const paymentOptions = useMemo(() => {
    const options = [
      { key: 'cash', label: 'Efectivo', enabled: appSettings.payCash !== false },
      { key: 'card', label: 'Tarjeta', enabled: appSettings.payCard !== false },
      { key: 'transfer', label: 'Transferencia', enabled: appSettings.payTransfer !== false },
      { key: 'qr', label: 'QR', enabled: appSettings.payQr !== false }
    ].filter((opt) => opt.enabled);

    if (!options.length) {
      return [{ key: 'cash', label: 'Efectivo', enabled: true }];
    }

    return options;
  }, [appSettings]);

  useEffect(() => {
    if (!paymentOptions.find((opt) => opt.key === paymentMethod)) {
      setPaymentMethod(paymentOptions[0]?.key || 'cash');
    }
  }, [paymentOptions, paymentMethod]);

  const baseSum = useMemo(() => items.reduce((sum, i) => sum + i.precio * i.cantidad, 0), [items]);
  const totals = useMemo(() => buildTotals(baseSum, taxSettings), [baseSum, taxSettings]);
  const tipRaw = totals.subtotal * (tipPercent / 100);
  const tipAmount = includeTip ? Math.round(tipRaw / 100) * 100 : 0;

  const discountAmount = useMemo(() => {
    const raw = String(discountValue || '').trim();
    if (!raw) return 0;
    if (raw.endsWith('%')) {
      const pct = Number(raw.replace('%', ''));
      if (!Number.isFinite(pct)) return 0;
      return Math.round((totals.total * pct) / 100);
    }
    const val = Number(raw);
    return Number.isFinite(val) ? Math.round(val) : 0;
  }, [discountValue, totals.total]);

  const grandTotal = totals.total + tipAmount - discountAmount;
  const change = paymentMethod === 'cash' && amountReceived
    ? Math.max(0, Math.round(Number(amountReceived) - grandTotal))
    : 0;

  const openModal = (key) => setModals((prev) => ({ ...prev, [key]: true }));
  const closeModal = (key) => setModals((prev) => ({ ...prev, [key]: false }));

  const handleEditPedido = () => {
    if (!mesaNumero) return;
    navigate(`/pedidos?mode=edit&mesa=${mesaNumero}`);
  };

  const handleDeletePedido = async () => {
    if (!pedido?._id) return;
    try {
      await authService.eliminarPedido(pedido._id);
      const mesas = await authService.getMesas();
      const mesa = (Array.isArray(mesas) ? mesas : []).find((m) => Number(m.numero) === mesaNumero);
      if (mesa) {
        await authService.actualizarMesa(mesa._id, { estado: 'disponible', pedido: null });
      }
      pushNotice('Pedido eliminado y mesa liberada.', 'success');
      closeModal('delete');
      navigate('/mesas');
    } catch (error) {
      console.error('Error eliminando pedido:', error);
      pushNotice('No se pudo eliminar el pedido.', 'error');
    }
  };

  const openFacturaPdf = (numero) => {
    if (!numero) {
      pushNotice('No hay factura generada aun.', 'warning');
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.open(`${baseUrl}/facturas/${numero}/pdf`, '_blank', 'noopener');
  };

  const openPreviewPdf = () => {
    if (!pedido?._id) {
      pushNotice('No hay pedido para imprimir.', 'warning');
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const params = new URLSearchParams({
      pedidoId: pedido._id,
      incluirPropina: includeTip ? 'true' : 'false',
      propinaPercent: String(tipPercent ?? 0),
      vatPercent: String(taxSettings.vatPercent ?? 19),
      applyVat: taxSettings.applyVat ? 'true' : 'false',
      pricesIncludeVat: taxSettings.pricesIncludeVat ? 'true' : 'false'
    });
    window.open(`${baseUrl}/facturas/preview?${params.toString()}`, '_blank', 'noopener');
  };

  const handleCompleteSale = async () => {
    if (!pedido?._id) return;

    try {
      const payload = {
        pedidoId: pedido._id,
        cliente: { nombre: 'Consumidor Final', documento: '000000' },
        metodoPago: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : paymentMethod === 'transfer' ? 'Transferencia' : 'QR',
        incluirPropina: includeTip,
        propinaPercent: tipPercent,
        taxSettings
      };

      const result = await authService.checkoutPedido(payload);
      setLastFactura(result?.factura || null);
      closeModal('complete');
      openModal('success');
      if (result?.factura?.numero) {
        openFacturaPdf(result.factura.numero);
      } else if (result?.pdfUrl) {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const origin = baseUrl.replace(/\/api\/?$/, '');
        window.open(`${origin}${result.pdfUrl}`, '_blank', 'noopener');
      }
    } catch (error) {
      console.error('Error completando venta:', error);
      pushNotice(error?.response?.data?.error || 'No se pudo completar la venta.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <UxToast notice={notice} onClose={() => setNotice(null)} />
        <div className="empty-state">Cargando pedido...</div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="checkout-page">
        <UxToast notice={notice} onClose={() => setNotice(null)} />
        <div className="empty-state">No hay pedido activo para esta mesa.</div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <div className="page-header">
        <div className="ph-icon">
          <svg viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.7">
            <rect x="3" y="4" width="16" height="16" rx="2" />
            <path d="M3 9h16M8 4v5M14 4v5" />
          </svg>
        </div>
        <div className="ph-text">
          <div className="ph-title">Completar Venta</div>
          <div className="ph-sub">Mesa {mesaNumero} • Pedido #{String(pedido._id || '').slice(-4).toUpperCase()}</div>
        </div>
        <div className="ph-badge">
          <svg viewBox="0 0 12 12" fill="currentColor">
            <circle cx="6" cy="6" r="2" />
          </svg>
          En proceso
        </div>
      </div>

      <div className="main-grid">
        <div className="order-panel">
          <div className="order-header">
            <div>
              <div className="order-title">Resumen del Pedido</div>
              <div className="order-time">Mesero: {pedido?.mesero?.nombre || pedido?.mesero?.username || pedido?.responsable || 'Sin asignar'}</div>
            </div>
          </div>

          <div className="order-items">
            {items.map((item, index) => (
              <div key={`${item.nombre}-${index}`} className="item-row">
                <div className="item-qty">{item.cantidad}</div>
                <div className="item-info">
                  <div className="item-name">{item.nombre}</div>
                  {item.obs ? <div className="item-note">{item.obs}</div> : null}
                </div>
                <div className="item-price">{toCurrency(item.precio * item.cantidad)}</div>
              </div>
            ))}
          </div>

          <div className="order-summary">
            <div className="summary-row">
              <div className="summary-label">Subtotal</div>
              <div className="summary-value">{toCurrency(totals.subtotal)}</div>
            </div>
            <div className="summary-row">
              <div className="summary-label">IVA ({taxSettings.applyVat ? taxSettings.vatPercent : 0}%)</div>
              <div className="summary-value">{toCurrency(totals.tax)}</div>
            </div>
            {includeTip && (
              <div className="summary-row">
                <div className="summary-label">Propina ({tipPercent}%)</div>
                <div className="summary-value">{toCurrency(tipAmount)}</div>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="summary-row">
                <div className="summary-label">Descuento</div>
                <div className="summary-value">-{toCurrency(discountAmount)}</div>
              </div>
            )}
            <div className="summary-row total">
              <div className="summary-label">Total a pagar</div>
              <div className="summary-value">{toCurrency(grandTotal)}</div>
            </div>
          </div>

          <div className="quick-actions">
            <button className="action-btn" type="button" onClick={() => openModal('edit')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" />
              </svg>
              Editar Pedido
            </button>
            <button className="action-btn" type="button" onClick={() => openModal('split')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 2v12M2 8h12M4 4h8M4 12h8" />
              </svg>
              Dividir Cuenta
            </button>
            <button className="action-btn" type="button" onClick={() => openModal('print')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 5V2h8v3M4 11H2V6h12v5h-2M4 11h8v3H4v-3z" />
              </svg>
              Imprimir Factura
            </button>
            <button className="action-btn danger" type="button" onClick={() => openModal('delete')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
              </svg>
              Eliminar Pedido
            </button>
          </div>
        </div>

        <div className="sidebar-panel">
          <div className="payment-card">
            <div className="card-label">Metodo de Pago</div>
            <div className="payment-methods">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`payment-opt${paymentMethod === opt.key ? ' selected' : ''}`}
                  onClick={() => setPaymentMethod(opt.key)}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            <input
              type="number"
              className="amount-input"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder={paymentMethod === 'cash' ? '$0.00' : 'Monto exacto'}
            />

            <div className={`change-display${paymentMethod === 'cash' && amountReceived && change >= 0 ? ' show' : ''}`}>
              <div className="change-label">Cambio a devolver</div>
              <div className="change-value">{toCurrency(change)}</div>
            </div>
          </div>

          <div className="extra-card">
            <div className="card-label">Opciones Adicionales</div>
            <div className="extra-item">
              <div>
                <div className="extra-label">Agregar propina</div>
                <div className="extra-hint">Opcional</div>
              </div>
              <input
                type="checkbox"
                checked={includeTip}
                onChange={(e) => setIncludeTip(e.target.checked)}
              />
            </div>
            <div className="extra-item">
              <div>
                <div className="extra-label">Descuento especial</div>
                <div className="extra-hint">% o $</div>
              </div>
              <input
                type="text"
                className="extra-input"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0%"
              />
            </div>
          </div>

          <button className="complete-btn" type="button" onClick={() => openModal('complete')}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l4 4 8-8" />
            </svg>
            Completar Venta
          </button>
        </div>
      </div>

      {modals.split && (
        <div className="modal-overlay show" onClick={() => closeModal('split')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Dividir Cuenta</div>
              <button className="modal-close" type="button" onClick={() => closeModal('split')}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-message">
                <p>Esta funcion estara disponible proximamente.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" onClick={() => closeModal('split')}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modals.edit && (
        <div className="modal-overlay show" onClick={() => closeModal('edit')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Editar Pedido</div>
              <button className="modal-close" type="button" onClick={() => closeModal('edit')}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-message warning">
                <p><strong>¿Deseas editar el pedido?</strong><br />Se abrira el pedido para modificar productos.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" onClick={() => closeModal('edit')}>Cancelar</button>
              <button className="btn-modal primary" type="button" onClick={handleEditPedido}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {modals.print && (
        <div className="modal-overlay show" onClick={() => closeModal('print')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Imprimir Factura</div>
              <button className="modal-close" type="button" onClick={() => closeModal('print')}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-message">
                <p><strong>¿Deseas imprimir la precuenta?</strong><br />Puedes imprimir antes de confirmar el pago.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" onClick={() => closeModal('print')}>Cancelar</button>
              <button className="btn-modal primary" type="button" onClick={openPreviewPdf}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {modals.delete && (
        <div className="modal-overlay show" onClick={() => closeModal('delete')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Eliminar Pedido</div>
              <button className="modal-close" type="button" onClick={() => closeModal('delete')}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-message danger">
                <p><strong>¿Estas seguro de eliminar este pedido?</strong><br />La mesa quedara disponible.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" onClick={() => closeModal('delete')}>Cancelar</button>
              <button className="btn-modal danger" type="button" onClick={handleDeletePedido}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {modals.complete && (
        <div className="modal-overlay show" onClick={() => closeModal('complete')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Completar Venta</div>
              <button className="modal-close" type="button" onClick={() => closeModal('complete')}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-message">
                <p><strong>¿Deseas completar la venta?</strong><br />Cambio a devolver: <strong>{toCurrency(change)}</strong></p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" onClick={() => closeModal('complete')}>Cancelar</button>
              <button className="btn-modal primary" type="button" onClick={handleCompleteSale}>Confirmar Venta</button>
            </div>
          </div>
        </div>
      )}

      {modals.success && (
        <div className="modal-overlay show" onClick={() => closeModal('success')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="success-animation">
                <div className="success-icon">
                  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M8 20l8 8 16-16" />
                  </svg>
                </div>
                <div className="success-title">Venta completada</div>
                <div className="success-desc">Pedido facturado exitosamente</div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-modal primary"
                type="button"
                onClick={() => {
                  closeModal('success');
                  navigate('/mesas');
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Volver a Mesas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
