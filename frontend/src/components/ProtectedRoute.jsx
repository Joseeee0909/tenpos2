import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Unauthorized() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>No autorizado</h2>
      <p>No tienes permisos para ver esta página.</p>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useContext(AuthContext);

  // Si no hay sesión válida, redirige al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere roles concretos y el usuario no los tiene, mostrar 403
  if (allowedRoles && Array.isArray(allowedRoles)) {
    const rol = user.rol;
    if (!allowedRoles.includes(rol)) {
      return <Unauthorized />;
    }
  }

  return children;
}
