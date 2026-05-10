import { useEffect, useMemo, useState } from 'react';
import { UxToast } from '../components/UXFeedback';
import { DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '../utils/settings';
import '../styles/settings.css';

const NAV_ITEMS = [
  {
    id: 'general',
    label: 'General',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2" y="2" width="14" height="14" rx="2" />
        <path d="M6 2v14M2 6h14M2 10h14M2 14h14" />
      </svg>
    )
  },
  {
    id: 'taxes',
    label: 'Impuestos y Propinas',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 14l10-10M5 5h.01M13 13h.01" />
        <circle cx="9" cy="9" r="7" />
      </svg>
    )
  },
  {
    id: 'payments',
    label: 'Metodos de Pago',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2" y="5" width="14" height="9" rx="1.5" />
        <path d="M2 8h14M5 11h3" />
      </svg>
    )
  },
  {
    id: 'receipts',
    label: 'Recibos e Impresion',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 2h10a2 2 0 012 2v12l-3-2-3 2-3-2-3 2V4a2 2 0 012-2z" />
        <path d="M7 6h4M7 10h4" />
      </svg>
    )
  },
  {
    id: 'notifications',
    label: 'Notificaciones',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M13 6a4 4 0 00-8 0c0 4.5-2 6-2 6h12s-2-1.5-2-6z" />
        <path d="M7.73 16a2 2 0 003.54 0" />
      </svg>
    )
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="5" y="8" width="8" height="8" rx="1.5" />
        <path d="M9 8V5a3 3 0 016 0v3M6 11h6" />
      </svg>
    )
  },
  {
    id: 'backups',
    label: 'Respaldos',
    icon: (
      <svg className="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="10" r="6" />
        <path d="M9 2v4M6 13l3-3 3 3" />
      </svg>
    )
  }
];

const SECTIONS = {
  general: {
    title: 'Configuracion General',
    desc: 'Ajustes basicos del restaurante y comportamiento del sistema',
    groups: [
      {
        label: 'Informacion del Negocio',
        items: [
          { type: 'input', name: 'Nombre del restaurante', hint: 'Se mostrara en todas las facturas', value: 'TenPos Restaurante', available: false },
          { type: 'input', name: 'Direccion', hint: 'Direccion completa del establecimiento', value: 'Calle 123 #45-67, Cali', available: false },
          { type: 'input', name: 'NIT / RUT', hint: 'Numero de identificacion tributaria', value: '900123456-7', available: false },
          { type: 'input', name: 'Telefono de contacto', hint: 'Numero principal del restaurante', value: '+57 300 123 4567', available: false }
        ]
      },
      {
        label: 'Configuracion Regional',
        items: [
          { type: 'select', name: 'Zona horaria', hint: 'Ajusta la hora del sistema', value: 'America/Bogota', options: ['America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Buenos_Aires'], available: false },
          { type: 'select', name: 'Formato de fecha', hint: 'Como se mostraran las fechas', value: 'DD/MM/YYYY', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], available: false },
          { type: 'select', name: 'Moneda', hint: 'Divisa utilizada en el sistema', value: 'COP (Peso Colombiano)', options: ['COP (Peso Colombiano)', 'USD (Dolar)', 'MXN (Peso Mexicano)', 'EUR (Euro)'], available: false }
        ]
      }
    ]
  },
  taxes: {
    title: 'Impuestos y Propinas',
    desc: 'Configura los porcentajes aplicables a las ventas',
    groups: [
      {
        label: 'Impuestos',
        items: [
          { type: 'input', key: 'vatPercent', name: 'IVA general', hint: 'Porcentaje aplicado al total de la venta', suffix: '%', available: true },
          { type: 'toggle', key: 'applyVat', name: 'Aplicar IVA automaticamente', hint: 'Incluye el IVA en todas las facturas', available: true },
          { type: 'toggle', key: 'pricesIncludeVat', name: 'Mostrar precios con IVA incluido', hint: 'Los precios en pantalla ya incluyen el impuesto', available: true },
          { type: 'input', name: 'Impuesto al consumo', hint: 'Porcentaje adicional (aplica segun normativa)', value: '8', suffix: '%', available: false }
        ]
      },
      {
        label: 'Propinas',
        items: [
          { type: 'toggle', name: 'Sugerir propina', hint: 'Ofrece agregar propina antes de cobrar', value: true, available: false },
          { type: 'input', name: 'Porcentaje de propina sugerido', hint: 'Valor predeterminado al activar propina', value: '10', suffix: '%', available: false },
          { type: 'toggle', name: 'Propina obligatoria en grupos grandes', hint: 'Aplica automaticamente en mesas de 6+ personas', value: false, available: false },
          { type: 'toggle', name: 'Incluir propina en base imponible', hint: 'La propina se suma antes de calcular IVA', value: false, available: false }
        ]
      }
    ]
  },
  payments: {
    title: 'Metodos de Pago',
    desc: 'Habilita y configura las formas de pago aceptadas',
    groups: [
      {
        label: 'Metodos Habilitados',
        items: [
          { type: 'toggle', name: 'Efectivo', hint: 'Pago en billetes y monedas', value: true, available: false },
          { type: 'toggle', name: 'Tarjeta debito/credito', hint: 'Pagos con tarjeta fisica', value: true, available: false },
          { type: 'toggle', name: 'Transferencia bancaria', hint: 'Pagos electronicos entre cuentas', value: true, available: false },
          { type: 'toggle', name: 'QR (PSE / Nequi / Daviplata)', hint: 'Codigos QR de pago instantaneo', value: false, available: false },
          { type: 'toggle', name: 'Vale / Bonos', hint: 'Cupones o vales prepagados', value: false, available: false }
        ]
      },
      {
        label: 'Opciones Avanzadas',
        items: [
          { type: 'toggle', name: 'Permitir pagos mixtos', hint: 'Combina varios metodos en una transaccion', value: true, available: false },
          { type: 'select', name: 'Redondeo en efectivo', hint: 'Redondea al multiplo mas cercano', value: '100', options: ['Sin redondeo', '50', '100', '500'], suffix: 'COP', available: false },
          { type: 'toggle', name: 'Solicitar cambio antes de confirmar', hint: 'Pregunta cuanto efectivo recibio el cajero', value: true, available: false }
        ]
      }
    ]
  },
  receipts: {
    title: 'Recibos e Impresion',
    desc: 'Personaliza el formato y contenido de las facturas impresas',
    groups: [
      {
        label: 'Formato del Recibo',
        items: [
          { type: 'select', name: 'Tamano del papel', hint: 'Ancho estandar de impresion', value: '80mm', options: ['58mm (Mini)', '80mm (Estandar)', 'A4 (Carta)'], available: false },
          { type: 'toggle', name: 'Incluir logo', hint: 'Imprime el logo del restaurante en la parte superior', value: true, available: false },
          { type: 'toggle', name: 'Mostrar informacion fiscal', hint: 'NIT, regimen tributario, resolucion DIAN', value: true, available: false },
          { type: 'toggle', name: 'Incluir numero de mesa', hint: 'Muestra la mesa en el recibo', value: true, available: false },
          { type: 'toggle', name: 'Mostrar nombre del mesero', hint: 'Incluye quien atendio la mesa', value: true, available: false }
        ]
      },
      {
        label: 'Impresion Automatica',
        items: [
          { type: 'toggle', name: 'Imprimir al confirmar pedido', hint: 'Envia ticket a cocina automaticamente', value: true, available: false },
          { type: 'toggle', name: 'Imprimir al cobrar', hint: 'Genera factura automaticamente al recibir pago', value: true, available: false },
          { type: 'select', name: 'Copias de factura', hint: 'Numero de copias impresas', value: '2', options: ['1 (Cliente)', '2 (Cliente + Copia)', '3 (Cliente + Copia + Cocina)'], available: false }
        ]
      },
      {
        label: 'Pie de Factura',
        items: [
          { type: 'input', name: 'Mensaje de despedida', hint: 'Texto al final del recibo', value: 'Gracias por su visita', available: false }
        ]
      }
    ]
  },
  notifications: {
    title: 'Notificaciones',
    desc: 'Controla las alertas y avisos del sistema',
    groups: [
      {
        label: 'Notificaciones de Pedidos',
        items: [
          { type: 'toggle', name: 'Alerta de pedido nuevo', hint: 'Notifica a cocina cuando llega un pedido', value: true, available: false },
          { type: 'toggle', name: 'Sonido de notificacion', hint: 'Reproduce audio al recibir pedidos', value: true, available: false },
          { type: 'toggle', name: 'Alerta de pedido listo', hint: 'Notifica al mesero cuando la cocina termina', value: true, available: false }
        ]
      },
      {
        label: 'Alertas del Sistema',
        items: [
          { type: 'toggle', key: 'lowStockAlerts', name: 'Stock bajo', hint: 'Avisa cuando un producto tiene poco inventario', available: true },
          { type: 'input', key: 'lowStockThreshold', name: 'Umbral de stock bajo', hint: 'Cantidad que activa la alerta', suffix: 'unidades', available: true },
          { type: 'toggle', name: 'Pedidos pendientes por >15min', hint: 'Alerta si un pedido no avanza', value: true, available: false },
          { type: 'toggle', name: 'Cierre de caja pendiente', hint: 'Recuerda cerrar turno al final del dia', value: true, available: false }
        ]
      }
    ]
  },
  security: {
    title: 'Seguridad',
    desc: 'Protege el acceso y la informacion del sistema',
    groups: [
      {
        label: 'Acceso y Sesiones',
        items: [
          { type: 'toggle', name: 'Requerir contrasena al iniciar', hint: 'Solicita credenciales al abrir TenPos', value: true, available: false },
          { type: 'toggle', name: 'Cerrar sesion automaticamente', hint: 'Cierra por inactividad despues de cierto tiempo', value: true, available: false },
          { type: 'select', name: 'Tiempo de inactividad', hint: 'Minutos antes de cerrar sesion', value: '30', options: ['5 minutos', '15 minutos', '30 minutos', '1 hora', 'Nunca'], available: false },
          { type: 'toggle', name: 'Bloquear pantalla con PIN', hint: 'Requiere codigo rapido para desbloquear', value: false, available: false }
        ]
      },
      {
        label: 'Permisos',
        items: [
          { type: 'toggle', name: 'Solicitar autorizacion para descuentos', hint: 'Requiere aprobacion de supervisor', value: true, available: false },
          { type: 'toggle', name: 'Solicitar autorizacion para anular', hint: 'Requiere aprobacion para anular facturas', value: true, available: false },
          { type: 'toggle', name: 'Restringir edicion de pedidos pagados', hint: 'Impide modificar pedidos una vez cobrados', value: true, available: false }
        ]
      }
    ]
  },
  backups: {
    title: 'Respaldos y Mantenimiento',
    desc: 'Protege tus datos con copias de seguridad automaticas',
    groups: [
      {
        label: 'Respaldo Automatico',
        items: [
          { type: 'toggle', name: 'Respaldar datos automaticamente', hint: 'Crea copias periodicas de la base de datos', value: true, available: false },
          { type: 'select', name: 'Frecuencia de respaldo', hint: 'Cada cuanto tiempo se crea una copia', value: 'Diariamente', options: ['Cada 6 horas', 'Diariamente', 'Semanalmente', 'Mensualmente'], available: false },
          { type: 'select', name: 'Retener respaldos', hint: 'Cuanto tiempo se guardan las copias', value: '30 dias', options: ['7 dias', '30 dias', '90 dias', '1 ano', 'Indefinido'], available: false }
        ]
      },
      {
        label: 'Acciones Manuales',
        items: [
          { type: 'action', name: 'Crear respaldo ahora', hint: 'Genera una copia de seguridad inmediata', btn: 'Respaldar', available: false },
          { type: 'action', name: 'Restaurar desde archivo', hint: 'Carga un respaldo previo', btn: 'Restaurar', available: false },
          { type: 'action', name: 'Exportar datos', hint: 'Descarga toda la informacion en formato CSV', btn: 'Exportar', available: false }
        ]
      },
      {
        label: 'Zona Peligrosa',
        items: [
          { type: 'danger', name: 'Restablecer configuracion', hint: 'Vuelve todos los ajustes a valores predeterminados', btn: 'Restablecer', available: false }
        ]
      }
    ]
  }
};

export default function SettingsPage() {
  const [notice, setNotice] = useState(null);
  const [current, setCurrent] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getStoredSettings());
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const pushNotice = (msg, type = 'success') => setNotice({ message: msg, type, id: Date.now() });

  const updateSetting = (key, value) => {
    let nextValue = value;
    if (key === 'vatPercent' || key === 'lowStockThreshold') {
      const numeric = Number(value || 0);
      const limited = key === 'vatPercent'
        ? Math.max(0, Math.min(100, Number.isNaN(numeric) ? 0 : numeric))
        : Math.max(0, Math.min(9999, Number.isNaN(numeric) ? 0 : numeric));
      nextValue = limited;
    }
    setSettings((prev) => {
      const next = { ...prev, [key]: nextValue };
      saveStoredSettings(next);
      return next;
    });
  };

  const save = () => {
    saveStoredSettings(settings);
    pushNotice('Configuracion guardada');
  };

  const restoreDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    saveStoredSettings(DEFAULT_SETTINGS);
    pushNotice('Valores por defecto restaurados');
  };

  const section = useMemo(() => SECTIONS[current], [current]);

  const renderControl = (item) => {
    if (item.type === 'toggle') {
      const on = item.available ? Boolean(settings[item.key]) : Boolean(item.value);
      return (
        <div
          className={`toggle-switch${on ? ' on' : ''}${item.available ? '' : ' disabled'}`}
          onClick={() => (item.available ? updateSetting(item.key, !on) : null)}
          role="button"
          tabIndex={0}
        >
          <div className="toggle-knob"></div>
        </div>
      );
    }

    if (item.type === 'input') {
      const value = item.available ? settings[item.key] : item.value;
      return (
        <div className="setting-control" style={{ display: 'flex', alignItems: 'center' }}>
          <input
            className={`input-control${item.suffix ? ' small' : ''}`}
            value={value}
            onChange={(e) => (item.available ? updateSetting(item.key, Number(e.target.value)) : null)}
            disabled={!item.available}
            type={item.available && typeof value === 'number' ? 'number' : 'text'}
          />
          {item.suffix ? <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginLeft: 6 }}>{item.suffix}</span> : null}
        </div>
      );
    }

    if (item.type === 'select') {
      const value = item.available ? settings[item.key] : item.value;
      return (
        <select
          className="select-control"
          value={value}
          onChange={(e) => (item.available ? updateSetting(item.key, e.target.value) : null)}
          disabled={!item.available}
        >
          {item.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (item.type === 'action') {
      return (
        <button className="btn-secondary" type="button" disabled>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 2v10M3 7h8"/></svg>
          {item.btn}
        </button>
      );
    }

    if (item.type === 'danger') {
      return (
        <button className="btn-danger" type="button" disabled>
          <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M5 5l4 4M9 5l-4 4"/></svg>
          {item.btn}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="settings-page">
      <UxToast notice={notice} onClose={() => setNotice(null)} />
      <div className="section-label">Configuracion del sistema</div>

      <div className="page-header">
        <div className="ph-icon">
          <svg viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.7">
            <circle cx="11" cy="11" r="3" />
            <path d="M11 1v3M11 18v3M20 11h-3M5 11H2M17.66 17.66l-2.12-2.12M6.46 6.46L4.34 4.34M17.66 4.34l-2.12 2.12M6.46 15.54l-2.12 2.12" />
          </svg>
        </div>
        <div className="ph-text">
          <div className="ph-title">Configuracion</div>
          <div className="ph-sub">Personaliza el comportamiento de TenPos</div>
        </div>
      </div>

      <div className="content-area">
        <div className="sidebar">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`nav-item${current === item.id ? ' active' : ''}`}
              onClick={() => setCurrent(item.id)}
              role="button"
              tabIndex={0}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="settings-panel">
          <div className="section-header">
            <div className="section-title">{section.title}</div>
            <div className="section-desc">{section.desc}</div>
          </div>

          {section.groups.map((group) => (
            <div key={group.label} className="settings-group">
              {group.label ? <div className="group-label">{group.label}</div> : null}
              {group.items.map((item) => (
                <div key={`${group.label}-${item.name}`} className="setting-row">
                  <div className="setting-left">
                    <div className="setting-name">
                      {item.name}
                      {!item.available ? <span className="badge-soon">Pronto</span> : null}
                    </div>
                    <div className="setting-hint">{item.hint}</div>
                  </div>
                  <div className="setting-control">
                    {renderControl(item)}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {current === 'taxes' ? (
            <div className="settings-group">
              <div className="info-box">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3.5M8 10.5v.5" />
                </svg>
                <p>Los cambios en impuestos afectan las nuevas ventas. Las facturas previas mantienen sus valores originales.</p>
              </div>
            </div>
          ) : null}

          {current === 'security' ? (
            <div className="settings-group">
              <div className="warn-box">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3.5M8 10.5v.5" />
                </svg>
                <p>Los cambios en seguridad aplican inmediatamente. Asegura que tu equipo conozca las nuevas politicas.</p>
              </div>
            </div>
          ) : null}

          <div className="action-zone">
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Los cambios disponibles se guardan automaticamente</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" type="button" onClick={restoreDefaults}>
                Restaurar valores
              </button>
              <button className="save-btn" type="button" onClick={save}>
                <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.8"><path d="M2.5 7l3 3 6-6"/></svg>
                Guardar configuracion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
