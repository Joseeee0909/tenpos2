import '../styles/ux-feedback.css';

export function UxToast({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className={`ux-toast ${notice.type || 'info'}`} role="status" aria-live="polite">
      <span>{notice.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar mensaje">×</button>
    </div>
  );
}

export function UxConfirm({ state, onCancel, onConfirm }) {
  if (!state) return null;

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="ux-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{state.title}</h3>
        <p>{state.message}</p>
        <div className="ux-confirm-actions">
          <button type="button" className="ux-btn ghost" onClick={onCancel}>Cancelar</button>
          <button
            type="button"
            className={`ux-btn ${state.confirmType === 'danger' ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {state.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
