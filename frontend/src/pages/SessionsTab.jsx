import { useState, useMemo, useEffect} from 'react';
import StatCard from '../components/StatCard';
import Toolbar, { FilterChips, ActionButtons } from '../components/Toolbar';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import authService from '../services/api';
import SessionCard from '../components/SessionCard';

const STATUS_CHIPS = [
  { key: 'all',    label: 'Todas',    color: '#5eead4' },
  { key: 'active', label: 'Activas',  color: '#059669' },
  { key: 'closed', label: 'Cerradas', color: '#64748b' },
];


const downloadIcon = (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 1v6M3 4l3 3 3-3" /><path d="M1 9h10" />
  </svg>
);

export default function SessionsTab() {
  const [statusFilter, setStatus] = useState('all');
  const [view, setView] = useState('list');
  const [sessions, setSessions] = useState([]);


  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessions = async () => {
  try {
    const logs = await authService.getSessions();

    const sessionsData = logs.map((log) => ({
  user: log.usuarioUsername,
  role: log.usuarioNombre,
  device: log.userAgent?.includes("Windows")
    ? "Windows"
    : "Desconocido",
  ip: log.ip,

  // 👇 IMPORTANTE: conservar datos crudos para estadísticas
  accion: log.accion,
  createdAt: log.createdAt,
  exito: log.exito,

  login: log.accion === "login"
    ? new Date(log.createdAt).toLocaleString()
    : null,

  logout: log.accion === "logout"
    ? new Date(log.createdAt).toLocaleString()
    : null,

  duration: "-",
  status: log.accion === "logout" ? "closed" : "active",
  avatar: log.usuarioUsername?.charAt(0)?.toUpperCase(),
}));

    setSessions(sessionsData);
  } catch (err) {
    console.error("Error cargando sesiones:", err);
  }
};

    fetchSessions();
  }, []);


  const filtered = useMemo(() => {
  return statusFilter === "all"
    ? sessions
    : sessions.filter((s) => s.status === statusFilter);
}, [statusFilter, sessions]);
  


 const stats = useMemo(() => {
  const hoy = new Date().toISOString().split("T")[0];

  const loginsHoy = sessions.filter(
    (s) =>
      s.accion === "login" &&
      s.createdAt?.split("T")[0] === hoy
  ).length;

  const intentosFallidos = sessions.filter(
    (s) =>
      s.accion === "login" &&
      s.exito === false
  ).length;

  return {
    sesiones:
    sessions.filter((s) => s.accion === "login").length -
    sessions.filter((s) => s.accion === "logout").length,

    logins: loginsHoy,
    fallidos: intentosFallidos,
    tiempoPromedio: "--"
  };
}, [sessions]);

  return (
    <div><PageHeader
                  label="Gestion de pedidos"
                  title={
                    view === "list"
                      ? "Sesiones activas"
                      : editingOrderId
                        ? "Editar pedido"
                        : "Nuevo pedido"
                  }
                  subtitle={
                    view === "list" ? `${stats.sesiones} sesiones activas` : ""
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
        <StatCard value={stats.sesiones} label="Sesiones activas" iconBg="#f0f9fb" icon={<svg viewBox="0 0 16 16" fill="none" stroke="#0891b2" strokeWidth="1.6"><path d="M2 6a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /><path d="M6 9h4" /></svg>} />
        <StatCard value={stats.logins} label="Inicios de sesión hoy" iconBg="#f3f4f6" icon={<svg viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="1.6"><path d="M2 8h12" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></svg>} />
        <StatCard value={stats.fallidos} label="Intentos fallidos" iconBg="#fef3c7" icon={<svg viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5M8 10.5v.5" /></svg>} />
        <StatCard value={stats.tiempoPromedio} label="Tiempo promedio de sesión" iconBg="#f0f9fb" icon={<svg viewBox="0 0 16 16" fill="none" stroke="#0891b2" strokeWidth="1.6"><path d="M2 8h12" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></svg>} />
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
