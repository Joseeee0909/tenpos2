import React from 'react';
import '../styles/menu.css';
import authService from '../services/api.js';


  

  const HomePage = () => {
  const [stats, setStats] = React.useState({
    productos: 0,
    usuarios: 0
  });

  React.useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Traer todos los productos
      const productosData = await authService.getProducts();
      const productosActivos = productosData.filter(p => p.disponible !== false).length;

      // Traer total de usuarios
      const totalUsuarios = await authService.getTotalUsers();

      setStats({
        productos: productosActivos,
        usuarios: totalUsuarios
      });
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    }
  };

  const dashboardStats = [
    { value: stats.productos, label: 'Productos Activos', icon: '📦', color: 'blue' },
    { value: stats.usuarios, label: 'Usuarios Registrados', icon: '👥', color: 'purple' },
    { value: '0', label: 'Órdenes Completadas', icon: '✅', color: 'green' },
    { value: '0', label: 'Calificación Promedio', icon: '⭐', color: 'orange' }
  ];

  const quickActions = [
    { id: 'productos', icon: '📦', text: 'Ver Productos', route: '/productos' },
    { id: 'usuarios', icon: '👥', text: 'Gestionar Usuarios', route: '/usuarios' },
    { id: 'roles', icon: '🔐', text: 'Configurar Roles', route: '/roles' }
  ];

  return (
    <div className="dashboard-page">
      <div className="welcome-banner">
        <h2>¡Bienvenido a TenPos! 👋</h2>
        <p>Gestiona tu restaurante de manera eficiente y profesional</p>
      </div>

      <div className="home-grid">
        {dashboardStats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="content-card" style={{ marginTop: '30px' }}>
        <h3 className="section-title">Acciones Rápidas</h3>
        <div className="quick-actions">
          {quickActions.map(action => (
            <div
              key={action.id}
              className="action-btn"
              style={{ cursor: 'pointer' }}
              onClick={() => window.location.href = action.route}
            >
              <div className="action-btn-icon">{action.icon}</div>
              <div className="action-btn-text">{action.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MenuPage = () => {
  return <HomePage />;
};

export default MenuPage;