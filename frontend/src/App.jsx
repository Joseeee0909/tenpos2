import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from 'react';
import Login from './pages/login.jsx';
import MenuPage from './pages/menu.jsx';
import SettingsPage from './pages/settings.jsx';
import MesasPage from './pages/mesas.jsx';
import PedidosPage from './pages/pedido.jsx';
import Products from './pages/product.jsx';
import VentasPage from './pages/ventas.jsx';
import RolesPage from './pages/roles.jsx';
import UserPage from './pages/user.jsx';
import Register from './pages/register.jsx';
import CheckoutPage from './pages/checkout.jsx';

import ReportesPage from './pages/ReportsTab.jsx';
import SessionPage from './pages/SessionsTab.jsx';
import HistorialPage from './pages/MyHistoryTab.jsx';
import ActivityTab from './pages/ActivityTab.jsx';

import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

function RoutesWrapper() {
  const { token } = useContext(AuthContext) || {};

  // Si no hay token, solo el login está disponible
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Rutas autenticadas
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/inicio" element={<MenuPage />} />
        <Route
          path="/productos"
          element={(
            <ProtectedRoute allowedPermissions={['ver_productos', 'gestionar_productos']}>
              <Products />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/ventas"
          element={(
            <ProtectedRoute allowedPermissions={['ver_ventas', 'gestionar_ventas']}>
              <VentasPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/configuracion" element={<SettingsPage />} />
        <Route
          path="/roles"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'root']} allowedPermissions={['gestionar_roles']}>
              <RolesPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/usuarios"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'root']} allowedPermissions={['gestionar_usuarios']}>
              <UserPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/mesas"
          element={(
            <ProtectedRoute allowedPermissions={['ver_mesas', 'gestionar_mesas']}>
              <MesasPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/utilidades/Historial"
          element={(
            <ProtectedRoute allowedPermissions={['ver_utilidades', 'gestionar_utilidades']}>
              <HistorialPage />
            </ProtectedRoute>
          )}
        />
          <Route
          path="/utilidades/Reportes"
          element={(
            <ProtectedRoute allowedPermissions={['ver_utilidades', 'gestionar_utilidades']}>
              <ReportesPage />
            </ProtectedRoute>
          )}
        />
          <Route
          path="/utilidades/Sesiones"
          element={(
            <ProtectedRoute allowedPermissions={['ver_utilidades', 'gestionar_utilidades']}>
              <SessionPage />
            </ProtectedRoute>
          )}
        />
          <Route
          path="/utilidades"
          element={(
            <ProtectedRoute allowedPermissions={['ver_utilidades', 'gestionar_utilidades']}>
              <ActivityTab />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/pedidos"
          element={(
            <ProtectedRoute allowedPermissions={['ver_pedidos', 'crear_pedidos', 'editar_pedidos']}>
              <PedidosPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <RoutesWrapper />
      </AuthProvider>
    </Router>
  );
}

export default App;
