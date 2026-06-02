import { useState } from 'react';
import '../styles/Modal.css';

const reportTitles = {
  behavior:    'Comportamiento de usuarios',
  operations:  'Operaciones por módulo',
  errors:      'Errores y alertas',
  security:    'Seguridad y accesos',
  performance: 'Rendimiento del sistema',
  compliance:  'Cumplimiento normativo',
};

export default function ReportModal({ reportType, onClose, onGenerate }) {
  const [period, setPeriod] = useState('Últimos 7 días');
  const [format, setFormat] = useState('pdf');
  const [includes, setIncludes] = useState({
    graficos: true,
    resumen: true,
    datos: true,
    recomendaciones: false,
  });
  const [email, setEmail] = useState('');

  const toggleInclude = (key) =>
    setIncludes((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <span className="modal-title">
            Generar: {reportTitles[reportType] || 'Reporte'}
          </span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Período de reporte</label>
            <select
              className="form-input select-input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
              <option>Últimos 90 días</option>
              <option>Este mes</option>
              <option>Mes anterior</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Formato de descarga</label>
            <div className="radio-group">
              {['pdf', 'csv', 'excel'].map((f) => (
                <label key={f} className="checkbox-opt">
                  <input
                    type="radio"
                    name="format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                  />
                  <span>{f.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Incluir en el reporte</label>
            {[
              { key: 'graficos',         label: 'Gráficos y visualizaciones' },
              { key: 'resumen',          label: 'Resumen ejecutivo'          },
              { key: 'datos',            label: 'Datos detallados'           },
              { key: 'recomendaciones',  label: 'Recomendaciones'            },
            ].map(({ key, label }) => (
              <label key={key} className="checkbox-opt">
                <input
                  type="checkbox"
                  checked={includes[key]}
                  onChange={() => toggleInclude(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Email para enviar reporte (opcional)</label>
            <input
              className="form-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-submit" onClick={() => onGenerate({ period, format, includes, email })}>
            Generar y descargar
          </button>
        </div>
      </div>
    </div>
  );
}
