import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/api.js';
import { AuthContext } from '../context/AuthContext';
import { UxToast } from '../components/UXFeedback';
import '../styles/menu.css';

const toCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('es-CO')}`;

const isToday = (dateValue) => {
  const d = new Date(dateValue || Date.now());
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'administrador') return 'admin';
  return value;
};

const formatClock = (dateValue) => {
  const d = new Date(dateValue || Date.now());
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function HomePage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [stats, setStats] = useState({
    productosActivos: 0,
    usuarios: 0,
    ordenesCompletadasHoy: 0,
    ticketPromedioHoy: 0,
    pedidosPreparando: 0,
    mesasOcupadas: 0,
    mesasDisponibles: 0,
    pedidosPendientes: 0
  });

  const canManageAccess = ['admin', 'root'].includes(normalizeRole(user?.rol));

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [productosData, totalUsuarios, pedidosData, mesasData] = await Promise.all([
        authService.getProducts(),
        authService.getTotalUsers(),
        authService.getPedidos(),
        authService.getMesas()
      ]);

      const productos = Array.isArray(productosData) ? productosData : [];
      const pedidos = Array.isArray(pedidosData) ? pedidosData : [];
      const mesas = Array.isArray(mesasData) ? mesasData : [];

      const productosActivos = productos.filter((p) => p.disponible !== false).length;

      const pedidosHoy = pedidos.filter((p) => isToday(p.fecha));
      const completadasHoy = pedidosHoy.filter((p) => String(p.estado || '').toLowerCase() === 'entregado');
      const totalCompletadas = completadasHoy.reduce((sum, p) => sum + Number(p.total || 0), 0);
      const ticketPromedioHoy = completadasHoy.length ? totalCompletadas / completadasHoy.length : 0;

      const pedidosPreparando = pedidos.filter((p) => String(p.estado || '').toLowerCase() === 'preparando').length;
      const pedidosPendientes = pedidos.filter((p) => String(p.estado || '').toLowerCase() === 'pendiente').length;

      const mesasOcupadas = mesas.filter((m) => ['ocupada', 'reservada'].includes(String(m.estado || '').toLowerCase())).length;
      const mesasDisponibles = mesas.filter((m) => String(m.estado || '').toLowerCase() === 'disponible').length;

      setStats({
        productosActivos,
        usuarios: Number(totalUsuarios || 0),
        ordenesCompletadasHoy: completadasHoy.length,
        ticketPromedioHoy,
        pedidosPreparando,
        mesasOcupadas,
        mesasDisponibles,
        pedidosPendientes
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando estadisticas:', err);
      pushNotice('No se pudieron actualizar las metricas del dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const dashboardStats = [
    {
      value: stats.productosActivos,
      label: 'Productos Activos',
      icon: '📦',
      tone: 'blue'
    },
    {
      value: stats.usuarios,
      label: 'Usuarios Registrados',
      icon: '👥',
      tone: 'violet'
    },
    {
      value: stats.ordenesCompletadasHoy,
      label: 'Ordenes Completadas Hoy',
      icon: '✅',
      tone: 'green'
    },
    {
      value: toCurrency(stats.ticketPromedioHoy),
      label: 'Ticket Promedio Hoy',
      icon: '💳',
      tone: 'amber',
      compact: true
    }
  ];

  const quickActions = useMemo(() => {
    const base = [
      { id: 'nuevo-pedido', icon: '🧾', text: 'Nuevo Pedido', route: '/pedidos?mode=create', tone: 'primary' },
      { id: 'mesas', icon: '🪑', text: 'Ver Mesas', route: '/mesas', tone: 'neutral' },
      { id: 'productos', icon: '📦', text: 'Ver Productos', route: '/productos', tone: 'neutral' }
    ];

    if (canManageAccess) {
      base.push(
        { id: 'usuarios', icon: '👥', text: 'Gestionar Usuarios', route: '/usuarios', tone: 'neutral' },
        { id: 'roles', icon: '🔐', text: 'Configurar Roles', route: '/roles', tone: 'neutral' }
      );
    }

    return base;
  }, [canManageAccess]);

  return (
    <div className="dashboard-page">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <section className="hero-band">
        <div className="hero-content">
          <div className="hero-badge">🚀 En vivo</div>
          <h2>Panel de Control</h2>
          <p>Visibilidad operativa en tiempo real para tu restaurante</p>
        </div>
        <div className="hero-meta">
          <button type="button" className="refresh-btn" onClick={loadStats} disabled={loading}>
            <span className="refresh-icon">{loading ? '⏳' : '🔄'}</span>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
          <span className="last-update">{lastUpdated ? `Última actualización: ${formatClock(lastUpdated)}` : 'Sin actualizar'}</span>
        </div>
      </section>

      <section className="home-grid">
        {dashboardStats.map((stat) => (
          <article key={stat.label} className={`stat-card ${stat.tone}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className={`stat-value ${stat.compact ? 'compact' : ''}`}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </article>
        ))}
      </section>

      <section className="live-strip">
        <div className="live-chip preparing">Preparando: <strong>{stats.pedidosPreparando}</strong></div>
        <div className="live-chip pending">Pendientes: <strong>{stats.pedidosPendientes}</strong></div>
        <div className="live-chip busy">Mesas ocupadas: <strong>{stats.mesasOcupadas}</strong></div>
        <div className="live-chip free">Mesas disponibles: <strong>{stats.mesasDisponibles}</strong></div>
      </section>

      <section className="content-card">
        <h3 className="section-title">Acciones Rapidas</h3>
        <div className="quick-actions">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className={`action-btn ${action.tone}`}
              onClick={() => navigate(action.route)}
              type="button"
            >
              <div className="action-btn-icon">{action.icon}</div>
              <div className="action-btn-text">{action.text}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function MenuPage() {
  return <HomePage />;
}
