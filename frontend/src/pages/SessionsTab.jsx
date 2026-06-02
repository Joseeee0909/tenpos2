import { useState, useMemo } from 'react';
import StatCard from '../components/StatCard';
import Toolbar, { FilterChips, ActionButtons } from '../components/Toolbar';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SessionCard from '../components/SessionCard';
import { sessions as allSessions } from '../data/mockData';

const STATUS_CHIPS = [
  { key: 'all',    label: 'Todas',    color: '#5eead4' },
  { key: 'active', label: 'Activas',  color: '#059669' },
  { key: 'closed', label: 'Cerradas', color: '#64748b' },
];

const STATS = [
  {
    value: 5, label: 'Sesiones activas', iconBg: '#f0f9fb',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="#0891b2" strokeWidth="1.6"><path d="M2 6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /><path d="M6 9h4" /></svg>,
  },
  {
    value: 23, label: 'Inicios de sesión hoy', iconBg: '#f3f4f6',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="1.6"><path d="M2 8h12" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></svg>,
  },
  {
    value: 1, label: 'Intentos fallidos', iconBg: '#fef3c7',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5M8 10.5v.5" /></svg>,
  },
  {
    value: '2.5h', label: 'Duración promedio', iconBg: '#ecfdf5',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="1.6"><path d="M2 8h12M8 2v12M2 8l2-2M2 8l2 2" /></svg>,
  },
];

const downloadIcon = (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 1v6M3 4l3 3 3-3" /><path d="M1 9h10" />
  </svg>
);

export default function SessionsTab() {
  const [statusFilter, setStatus] = useState('all');
  const [view, setView] = useState('list');
  const navigate = useNavigate();
  const filtered = useMemo(
    () => statusFilter === 'all' ? allSessions : allSessions.filter((s) => s.status === statusFilter),
    [statusFilter]
  );
  
 const stats = useMemo(() => {
      const today = new Date().toISOString().slice(0, 10);
      return {
        total: 1,
        changes: 2,
        users: 5,
        errors: 4,
      };
    }, []);

  return (
    <div><PageHeader
                  label="Gestion de pedidos"
                  title={
                    view === "list"
                      ? "Gestion de pedidos"
                      : editingOrderId
                        ? "Editar pedido"
                        : "Nuevo pedido"
                  }
                  subtitle={
                    view === "list" ? `${stats.total} pedidos registrados hoy` : ""
                  }
                  iconColor="#3b3b7d"
                  icon={
                    <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
                      <rect x="4" y="3" width="12" height="14" rx="2" />
                      <path d="M7 7h6M7 10h4" />
                    </svg>
                  }
                  actions={
                    view === "list" ? (
                      <>
                        <button
                          className="btn-outline"
                          onClick={() => navigate("/utilidades")}
                        >
                          Actividad
                        </button>
                        <button className="btn-outline" onClick={() => navigate("/utilidades/reportes")}type="button">
                          Reportes
                        </button>
                        <button className="btn-outline" onClick={() => navigate("/utilidades/historial")}type="button">
                          Historial
                        </button>
                        <div className="ph-divider"></div>
                      </>
                    ) : null
                  }
                />
      <div className="stats-row" style={{ marginBottom: 20 }}>
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <Toolbar>
        <FilterChips chips={STATUS_CHIPS} active={statusFilter} onSelect={setStatus} />
        <span className="spacer" />
        <ActionButtons
          buttons={[
            { label: 'Descargar reporte', icon: downloadIcon, onClick: () => alert('Descargando reporte de sesiones...') },
          ]}
        />
      </Toolbar>

      <div>
        {filtered.map((s, i) => (
          <SessionCard key={i} session={s} />
        ))}
      </div>
    </div>
  );
}
