import { useContext, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UxConfirm } from './UXFeedback';
import '../styles/sidebar.css';

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext) || {};
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const normalizeRole = (role) => {
    const raw = String(role || '').trim().toLowerCase();
    if (raw === 'administrador') return 'admin';
    return raw;
  };

  const canManageAccess = ['admin', 'root'].includes(normalizeRole(user?.rol));

  const menuItems = [
    { id: 'inicio', icon: '🏠', text: 'Inicio', route: '/inicio' },
    { id: 'productos', icon: '📦', text: 'Productos', route: '/productos' },
    { id: 'pedidos', icon: '📋', text: 'Pedidos', route: '/pedidos' },
    { id: 'mesas', icon: '🪑', text: 'Mesas', route: '/mesas' },
    ...(canManageAccess
      ? [
          { id: 'roles', icon: '🔑', text: 'Roles', route: '/roles' },
          { id: 'usuarios', icon: '👥', text: 'Usuarios', route: '/usuarios' }
        ]
      : [])
  ];

  const handleLogout = () => {
    setConfirmLogout(true);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);

  const confirmLogoutAction = () => {
    localStorage.clear();
    navigate('/login');
    setConfirmLogout(false);
  };

  return (
    <>
      <UxConfirm
        state={confirmLogout ? {
          title: 'Cerrar sesion',
          message: 'Tu sesion actual se cerrara y volveras a la pantalla de acceso.',
          confirmLabel: 'Cerrar sesion',
          confirmType: 'danger'
        } : null}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={confirmLogoutAction}
      />

      <button
        type="button"
        className="shell-mobile-toggle"
        aria-label="Abrir menu"
        onClick={toggleMobileMenu}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {mobileOpen && <div className="shell-mobile-overlay" onClick={() => setMobileOpen(false)}></div>}

      <aside className={`shell-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="shell-sidebar-header">
        <div className="shell-logo">
          <div className="shell-logo-icon">🍽️</div>
          <div className="shell-logo-text">
            <h2>TenPos</h2>
            <p>L10</p>
          </div>
        </div>
        {user && (
          <div className="shell-user-info">
            {user.username} ({user.rol})
          </div>
        )}
      </div>

        <nav className="shell-sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.route}
            className={({ isActive }) => `shell-menu-item${isActive ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className="shell-menu-icon">{item.icon}</div>
            <div className="shell-menu-text">{item.text}</div>
          </NavLink>
        ))}
        </nav>

        <div className="shell-sidebar-footer">
          <button className="shell-logout-btn" onClick={handleLogout}>
            <div className="shell-menu-icon">🔚</div>
            <div className="shell-menu-text">Cerrar Sesión</div>
          </button>
        </div>
      </aside>
    </>
  );
}
