import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from 'react';
import Login from './pages/login.jsx';
import MenuPage from './pages/menu.jsx';
import MesasPage from './pages/mesas.jsx';
import PedidosPage from './pages/pedido.jsx';
import Products from './pages/product.jsx';
import RolesPage from './pages/roles.jsx';
import UserPage from './pages/user.jsx';
import Register from './pages/register.jsx';
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
        <Route path="/productos" element={<Products />} />
        <Route
          path="/roles"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'root']}>
              <RolesPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/usuarios"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'root']}>
              <UserPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/register" element={<Register />} />
        <Route path="/mesas" element={<MesasPage />} />
        <Route path="/pedidos" element={<PedidosPage />} />
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
