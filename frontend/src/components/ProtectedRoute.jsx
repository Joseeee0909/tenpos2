import { useContext } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/access-denied.css';

const normalizeRole = (role) => {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'administrador') return 'admin';
  return raw;
};

function Unauthorized({ section = 'este apartado' }) {
  return (
    <div className="access-denied-wrap">
      <div className="access-denied-card">
        <div className="access-denied-icon" aria-hidden="true">🔒</div>
        <h2>No tienes acceso a este apartado</h2>
        <p>
          Tu perfil no cuenta con permisos para ingresar a {section}. Si crees que esto es un error,
          contacta a una persona administradora para solicitar acceso.
        </p>
        <div className="access-denied-actions">
          <Link to="/inicio" className="access-btn primary">Volver al inicio</Link>
          <Link to="/productos" className="access-btn ghost">Ir a productos</Link>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles, allowedPermissions }) {
  const { user, token } = useContext(AuthContext);
  const location = useLocation();

  // Si no hay sesión válida, redirige al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const rol = normalizeRole(user?.rol);
  const isAdmin = ['admin', 'root'].includes(rol);
  const userPerms = Array.isArray(user?.permisos) ? user.permisos : [];

  const hasRoles = allowedRoles && Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole).includes(rol)
    : false;

  const hasPermissions = allowedPermissions && Array.isArray(allowedPermissions)
    ? allowedPermissions.some((perm) => userPerms.includes(perm))
    : true;

  if ((allowedRoles || allowedPermissions) && !(isAdmin || hasRoles || hasPermissions)) {
    const section = location.pathname.includes('/roles')
      ? 'Roles'
      : location.pathname.includes('/usuarios')
        ? 'Usuarios'
        : 'esta seccion';

    return <Unauthorized section={section} />;
  }

  return children;
}
