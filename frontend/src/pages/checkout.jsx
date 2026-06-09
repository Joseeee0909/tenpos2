import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/api';
import { UxToast } from '../components/UXFeedback';
import { getStoredSettings } from '../utils/settings';
import { toCurrency } from '../utils/format';
import { buildTotals, readTaxSettings } from '../utils/tax';
import '../styles/checkout.css';

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    return user?.id || null;
  } catch {
    return null;
  }
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mesaNumero = Number(params.get('mesa') || 0);

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

  // Estado para controlar la espera visual dentro del propio botón/modal
  const [isProcessing, setIsProcessing] = useState(false);

  const [modals, setModals] = useState({
    split: false,
    edit: false,
    print: false,
    delete: false,
    complete: false
  });

  const pushNotice = (message, type = 'info') =>
    setNotice({ message, type, id: Date.now() });

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const handleSettings = () => {
      const stored = getStoredSettings();
      setAppSettings(stored);
      setTaxSettings(readTaxSettings());
      setTipPercent(Number(stored.tipPercent ?? 10));
      setIncludeTip(Boolean(stored.tipSuggested));
    };

    handleSettings();
    window.addEventListener('app-settings-updated', handleSettings);
    return () =>
      window.removeEventListener('app-settings-updated', handleSettings);
  }, []);

  const loadPedido = async () => {
    try {
      const pedido = await authService.getPedidoActivoMesa(mesaNumero);
      setPedido(pedido);
    } catch (e) {
      pushNotice('Error cargando pedido', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPedido();
  }, [mesaNumero]);

  const items = useMemo(() => {
    if (!pedido?.productos) return [];
    return pedido.productos.map((i) => ({
      nombre: i.nombre,
      cantidad: Number(i.cantidad || 1),
      precio: Number(i.precio || 0),
      obs: i.obs || ''
    }));
  }, [pedido]);

  const paymentOptions = useMemo(() => {
    const opts = [
      { key: 'cash', label: 'Efectivo', enabled: appSettings.payCash !== false },
      { key: 'card', label: 'Tarjeta', enabled: appSettings.payCard !== false },
      { key: 'transfer', label: 'Transferencia', enabled: appSettings.payTransfer !== false },
      { key: 'qr', label: 'QR', enabled: appSettings.payQr !== false }
    ].filter((o) => o.enabled);

    return opts.length ? opts : [{ key: 'cash', label: 'Efectivo' }];
  }, [appSettings]);

  const baseSum = useMemo(
    () => items.reduce((s, i) => s + i.precio * i.cantidad, 0),
    [items]
  );

  const openModal = (key) => {
    setModals((prev) => ({ ...prev, [key]: true }));
  };

  const closeModal = (key) => {
    setModals((prev) => ({ ...prev, [key]: false }));
  };

  const totals = useMemo(
    () => buildTotals(baseSum, taxSettings),
    [baseSum, taxSettings]
  );

  const tipAmount = includeTip
    ? Math.round((totals.subtotal * tipPercent) / 100)
    : 0;

  const discountAmount = useMemo(() => {
    const raw = String(discountValue || '').trim();
    if (!raw) return 0;
    if (raw.endsWith('%')) {
      return Math.round((totals.total * Number(raw.replace('%', ''))) / 100);
    }
    return Math.round(Number(raw) || 0);
  }, [discountValue, totals.total]);

  const grandTotal = totals.total + tipAmount - discountAmount;
  const change = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;

    const recibido = Number(amountReceived || 0);

  if (isNaN(recibido)) return 0;

    return Math.max(
      0,
      recibido - grandTotal
    );
  }, [amountReceived, grandTotal, paymentMethod]);
  const openPreviewPdf = async () => {
    try {
      const res = await authService.api.get('/facturas/preview', {
        params: {
          pedidoId: pedido.id,
          incluirPropina: includeTip,
          propinaPercent: tipPercent,
          vatPercent: taxSettings.vatPercent,
          applyVat: taxSettings.applyVat,
          pricesIncludeVat: taxSettings.pricesIncludeVat
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' })
      );

      window.open(url, '_blank');
    } catch (e) {
      pushNotice('No se pudo generar PDF', 'error');
    }
  };

  const handleCompleteSale = async () => {

  if (paymentMethod === 'cash') {
    const recibido = Number(amountReceived || 0);

    if (!recibido) {
      pushNotice(
        'Debes ingresar el valor recibido.',
        'warning'
      );
      return;
    }

    if (recibido < grandTotal) {
      pushNotice(
        `El valor recibido es insuficiente. Faltan ${toCurrency(
          grandTotal - recibido
        )}`,
        'error'
      );
      return;
    }
  }

  try {
    setIsProcessing(true);

    const result = await authService.checkoutPedido({
  pedidoId: pedido.id,
  metodoPago: paymentMethod,
  incluirPropina: includeTip,
  propinaPercent: tipPercent,
  taxSettings,
  mesero: getCurrentUserId(),

  montoRecibido:
    paymentMethod === 'cash'
      ? Number(amountReceived)
      : grandTotal,

  cambio:
    paymentMethod === 'cash'
      ? change
      : 0
});

    if (result?.factura?.numero) {
      authService.api
        .get(`/facturas/${result.factura.numero}/pdf`, {
          responseType: 'blob'
        })
        .then((res) => {
          const url = window.URL.createObjectURL(
            new Blob([res.data], {
              type: 'application/pdf'
            })
          );

          window.open(url, '_blank');
        })
        .catch((err) =>
          console.error(
            'Error al obtener el archivo PDF:',
            err
          )
        );
    }

    setPedido(null);

    closeModal('complete');

    navigate('/mesas', {
      state: {
        saleSuccess: true,
        mesaLiberada: mesaNumero
      }
    });

  } catch (e) {
    console.error(e);
    pushNotice(
      'Error completando venta',
      'error'
    );
  } finally {
    setIsProcessing(false);
  }
};

  const handleEditPedido = () => {
    closeModal('edit');
    navigate(`/pedido?mesa=${mesaNumero}`);
  };

  const handleDeletePedido = async () => {
    try {
      closeModal('delete');
      setLoading(true);
      await authService.deletePedido(pedido.id);
      navigate('/mesas');
    } catch (e) {
      pushNotice('Error eliminando pedido', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-view">Cargando datos del pedido...</div>;
  if (!pedido) return <div className="loading-view">No hay un pedido activo para esta mesa.</div>;

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
          <div className="ph-sub">Mesa {mesaNumero} • Pedido #{String(pedido.id || '').slice(-4).toUpperCase()}</div>
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
              <div className="order-time">Mesero: {pedido?.mesero?.nombre || pedido?.mesero?.username || 'Sin asignar'}</div>
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
            <button className="action-btn" type="button" onClick={() => openModal('edit')}>Editar Pedido</button>
            <button className="action-btn" type="button" onClick={() => openModal('split')}>Dividir Cuenta</button>
            <button className="action-btn" type="button" onClick={() => openModal('print')}>Imprimir Factura</button>
            <button className="action-btn danger" type="button" onClick={() => openModal('delete')}>Eliminar Pedido</button>
          </div>
        </div>

        <div className="sidebar-panel">
          <div className="payment-card">
            <div className="card-label">Método de Pago</div>
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
              placeholder="$0.00"
            />

            <div className={`change-display${paymentMethod === 'cash' && amountReceived && change >= 0 ? ' show' : ''}`}>
              <div className="change-label">Cambio a devolver</div>
              <div className="change-value">{toCurrency(change)}</div>
            </div>
          </div>

          <button className="complete-btn" type="button" onClick={() => openModal('complete')}>
            Completar Venta
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN - EL ÚNICO QUE SE QUEDA EN ESPERA */}
      {modals.complete && (
        <div className="modal-overlay show">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Confirmar Transacción</div>
              {!isProcessing && <button className="modal-close" type="button" onClick={() => closeModal('complete')}>×</button>}
            </div>
            <div className="modal-body">
              <div className="confirm-message">
                <p>¿Deseas liquidar la cuenta e imprimir la factura?</p>
                <p style={{ marginTop: '8px' }}>Total: <strong>{toCurrency(grandTotal)}</strong></p>
                {paymentMethod === 'cash' && <p>Cambio: <strong>{toCurrency(change)}</strong></p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-modal secondary" type="button" disabled={isProcessing} onClick={() => closeModal('complete')}>
                Cancelar
              </button>
              <button className="btn-modal primary" type="button" disabled={isProcessing} onClick={handleCompleteSale}>
                {isProcessing ? 'Procesando pago...' : 'Confirmar y Pagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS SECUNDARIOS */}
      {modals.split && (
        <div className="modal-overlay show" onClick={() => closeModal('split')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body"><p>Próximamente disponible.</p></div>
            <div className="modal-footer"><button className="btn-modal secondary" onClick={() => closeModal('split')}>Cerrar</button></div>
          </div>
        </div>
      )}

      {modals.edit && (
        <div className="modal-overlay show" onClick={() => closeModal('edit')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body"><p>¿Ir a la pantalla de edición del pedido?</p></div>
            <div className="modal-footer">
              <button className="btn-modal secondary" onClick={() => closeModal('edit')}>No</button>
              <button className="btn-modal primary" onClick={handleEditPedido}>Editar</button>
            </div>
          </div>
        </div>
      )}

      {modals.print && (
        <div className="modal-overlay show" onClick={() => closeModal('print')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body"><p>¿Imprimir copia de precuenta?</p></div>
            <div className="modal-footer">
              <button className="btn-modal secondary" onClick={() => closeModal('print')}>Cancelar</button>
              <button className="btn-modal primary" onClick={openPreviewPdf}>Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {modals.delete && (
        <div className="modal-overlay show" onClick={() => closeModal('delete')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body"><p>¿Estás seguro de eliminar por completo este pedido?</p></div>
            <div className="modal-footer">
              <button className="btn-modal secondary" onClick={() => closeModal('delete')}>Cancelar</button>
              <button className="btn-modal danger" onClick={handleDeletePedido}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}