import React, { useState } from 'react';
import './styles.css';

const Sidebar = ({ activePage, setActivePage, onLogout }) => {
  const menuItems = [
    { id: 'inicio', icon: '🏠', text: 'Inicio' },
    { id: 'login', icon: '🔑', text: 'Login' },
    { id: 'productos', icon: '📦', text: 'Productos' },
    { id: 'usuarios', icon: '👥', text: 'Usuarios' },
    { id: 'roles', icon: '🔐', text: 'Roles' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">🍽️</div>
          <div className="logo-text">
            <h2>Sistema</h2>
            <p>Restaurante</p>
          </div>
        </div>
      </div>

      <div className="sidebar-menu">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`menu-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <div className="menu-icon">{item.icon}</div>
            <div className="menu-text">{item.text}</div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <div className="menu-icon">🚪</div>
          <div className="menu-text">Cerrar Sesión</div>
        </button>
      </div>
    </div>
  );
};

const HomePage = ({ onNavigate }) => {
  const stats = [
    { value: '156', label: 'Productos Activos', icon: '📦', color: 'blue' },
    { value: '24', label: 'Usuarios Registrados', icon: '👥', color: 'purple' },
    { value: '892', label: 'Órdenes Completadas', icon: '✅', color: 'green' },
    { value: '4.8', label: 'Calificación Promedio', icon: '⭐', color: 'orange' }
  ];

  const quickActions = [
    { id: 'productos', icon: '📦', text: 'Ver Productos' },
    { id: 'usuarios', icon: '👥', text: 'Gestionar Usuarios' },
    { id: 'roles', icon: '🔐', text: 'Configurar Roles' },
    { id: 'login', icon: '🔑', text: 'Iniciar Sesión' }
  ];

  return (
    <div>
      <div className="welcome-banner">
        <h2>¡Bienvenido al Sistema! 👋</h2>
        <p>Gestiona tu restaurante de manera eficiente y profesional</p>
      </div>

      <div className="home-grid">
        {stats.map((stat, index) => (
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
              onClick={() => onNavigate(action.id)}
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

const ContentPage = ({ page, pageData }) => {
  return (
    <div>
      <div className="content-header">
        <h1>{pageData.title}</h1>
        <p>{pageData.description}</p>
      </div>

      <div className="content-card">
        <p>{pageData.content}</p>
      </div>
    </div>
  );
};

const App = () => {
  const [activePage, setActivePage] = useState('inicio');

  const pages = {
    inicio: {
      title: 'Inicio',
      description: 'Panel principal del sistema',
      content: 'Bienvenido al sistema de gestión del restaurante.'
    },
    login: {
      title: 'Login',
      description: 'Iniciar sesión en el sistema',
      content: 'Página de inicio de sesión. Aquí los usuarios pueden autenticarse en el sistema.'
    },
    productos: {
      title: 'Productos',
      description: 'Gestión del catálogo de productos',
      content: 'Administra el catálogo completo de productos del restaurante. Agrega, edita o elimina productos.'
    },
    usuarios: {
      title: 'Usuarios',
      description: 'Administración de usuarios del sistema',
      content: 'Gestiona los usuarios del sistema. Crea nuevos usuarios, modifica permisos y administra el personal.'
    },
    roles: {
      title: 'Roles',
      description: 'Configuración de roles y permisos',
      content: 'Define y configura los roles del sistema. Asigna permisos específicos a cada rol.'
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      alert('Sesión cerrada exitosamente');
      setActivePage('inicio');
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={handleLogout}
      />
      
      <div className="main-content">
        {activePage === 'inicio' ? (
          <HomePage onNavigate={setActivePage} />
        ) : (
          <ContentPage page={activePage} pageData={pages[activePage]} />
        )}
      </div>
    </div>
  );
};

export default App;