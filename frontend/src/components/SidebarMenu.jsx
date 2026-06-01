import { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { normalizeRole } from '../utils/authSession';
import { UxConfirm } from './UXFeedback';
import { getStoredSettings } from '../utils/settings';
import '../styles/sidebar.css';

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext) || {};
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appSettings, setAppSettings] = useState(getStoredSettings());
  const { logout } = useContext(AuthContext) || {};
  const roleKey = normalizeRole(user?.rol);
  const isAdmin = ['admin', 'root'].includes(roleKey);
  const userPerms = Array.isArray(user?.permisos) ? user.permisos : [];

  const hasPermission = (required) => {
    if (!required || !required.length) return true;
    if (isAdmin) return true;
    return required.some((perm) => userPerms.includes(perm));
  };

  const PERM_BY_ITEM = {
    productos: ['ver_productos', 'gestionar_productos'],
    pedidos: ['ver_pedidos', 'crear_pedidos', 'editar_pedidos'],
    ventas: ['ver_ventas', 'gestionar_ventas'],
    mesas: ['ver_mesas', 'gestionar_mesas'],
    roles: ['gestionar_roles'],
    usuarios: ['gestionar_usuarios']
  };

  useEffect(() => {
    const handleSettings = (event) => {
      const next = event?.detail || getStoredSettings();
      setAppSettings(next);
    };
    const handleStorage = (event) => {
      if (event.key === 'app_settings') handleSettings();
    };
    window.addEventListener('app-settings-updated', handleSettings);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('app-settings-updated', handleSettings);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const menuItems = useMemo(() => {
    const baseItems = [
      { id: 'inicio', icon: '🏠', text: 'Inicio', route: '/inicio' },
      { id: 'productos', icon: '📦', text: 'Productos', route: '/productos' },
      { id: 'pedidos', icon: '📋', text: 'Pedidos', route: '/pedidos' },
      { id: 'ventas', icon: '💰', text: 'Ventas', route: '/ventas' },
      { id: 'mesas', icon: '🪑', text: 'Mesas', route: '/mesas' },
      { id: 'roles', icon: '🔑', text: 'Roles', route: '/roles' },
      { id: 'usuarios', icon: '👥', text: 'Usuarios', route: '/usuarios' },
      { id: 'config', icon: '⚙️', text: 'Configuración', route: '/configuracion' }
    ];

    const allowed = baseItems.filter((item) => {
      if (item.id === 'inicio') return true;
      const required = PERM_BY_ITEM[item.id];
      return hasPermission(required);
    });

    const order = Array.isArray(appSettings.menuOrder) && appSettings.menuOrder.length
      ? appSettings.menuOrder
      : baseItems.map((item) => item.id);

    const byId = new Map(allowed.map((item) => [item.id, item]));
    const ordered = [
      ...order.map((id) => byId.get(id)).filter(Boolean),
      ...allowed.filter((item) => !order.includes(item.id))
    ];

    return ordered;
  }, [appSettings.menuOrder, isAdmin, userPerms.join('|')]);

  const handleLogout = () => {
    setConfirmLogout(true);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => setMobileOpen((prev) => !prev);

  const confirmLogoutAction = () => {
    if (typeof logout === 'function') {
      logout();
    } else {
      navigate('/login');
    }
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
