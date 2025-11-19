import React, { useContext } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import '../styles/menu.css';
import { AuthContext } from '../context/AuthContext';

  const Sidebar = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext) || {};
    const menuItems = [
      { id: 'inicio', icon: '🏠', text: 'Inicio', route: '/menu/inicio' },
      { id: 'productos', icon: '📦', text: 'Productos', route: '/menu/productos' },
      { id: 'roles', icon: '🔑', text: 'Roles', route: '/menu/roles' },
      { id: 'usuarios', icon: '👥', text: 'Usuarios', route: '/menu/usuarios' }
    ];

    const handleLogout = () => {
      if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.clear();
        navigate('/login');
      }
    };

    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🍽️</div>
            <div className="logo-text">
              <h2>TenPos</h2>
              <p>L10</p>
            </div>
          </div>
          {user && (
            <div className="user-info" style={{ marginTop: 10, fontWeight: 500 }}>
              {user.username} ({user.rol})
            </div>
          )}
        </div>

        <div className="sidebar-menu">
          {menuItems.map(item => (
            <NavLink
              key={item.id}
              to={item.route}
              className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="menu-icon">{item.icon}</div>
              <div className="menu-text">{item.text}</div>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <div className="menu-icon">🔚</div>
            <div className="menu-text">Cerrar Sesión</div>
          </button>
        </div>
      </div>
    );
  };

  const HomePage = () => {
    const navigate = useNavigate();
    const stats = [
      { value: '0', label: 'Productos Activos', icon: '📦', color: 'blue' },
      { value: '0', label: 'Usuarios Registrados', icon: '👥', color: 'purple' },
      { value: '0', label: 'Órdenes Completadas', icon: '✅', color: 'green' },
      { value: '0', label: 'Calificación Promedio', icon: '⭐', color: 'orange' }
    ];

    const quickActions = [
      { id: 'productos', icon: '📦', text: 'Ver Productos', route: '/menu/productos' },
      { id: 'usuarios', icon: '👥', text: 'Gestionar Usuarios', route: '/menu/usuarios' },
      { id: 'roles', icon: '🔐', text: 'Configurar Roles', route: '/menu/roles' }
    ];

    return (
      <div>
        <div className="welcome-banner">
          <h2>¡Bienvenido a TenPos! 👋</h2>
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
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(action.route)}
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


import Products from './product.jsx';
import RolesPage from './roles.jsx';
import Register from './register.jsx';
import NavBar from '../components/NavBar';

  const MenuPage = () => {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="" element={<Navigate to="inicio" replace />} />
            <Route path="inicio" element={<HomePage />} />
            <Route path="productos" element={<Products />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="usuarios" element={<Register />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </div>
      </div>
    );
  };

export default MenuPage;