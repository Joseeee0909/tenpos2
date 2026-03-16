import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from 'react';
import Login from './pages/login.jsx';
import MenuPage from './pages/menu.jsx';
import MesasPage from './pages/mesas.jsx';
import PedidosPage from './pages/pedido.jsx';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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
      <Route path="/" element={<Navigate to="/menu" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/menu/*"
        element={
          <ProtectedRoute>
            <MenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mesas"
        element={
          <ProtectedRoute>
            <MesasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos"
        element={
          <ProtectedRoute>
            <PedidosPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/menu" replace />} />
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
