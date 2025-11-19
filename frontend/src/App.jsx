import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from 'react';
import Register from './pages/register.jsx';
import Login from './pages/login.jsx';
import RolesPage from './pages/roles.jsx';
import ProductsPage from './pages/product.jsx';
import MenuPage from './pages/menu.jsx';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';

function RoutesWrapper() {
  const { token } = useContext(AuthContext) || {};

  // If there's no token, only allow /login. Redirect all other paths to /login.
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated routes
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
        path="/productos"
        element={
          <ProtectedRoute allowedRoles={["administrador", "admin", "root"]}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/register"
        element={
          <ProtectedRoute allowedRoles={["administrador", "admin", "root"]}>
            <Register />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute allowedRoles={["administrador", "admin", "root"]}>
            <RolesPage />
          </ProtectedRoute>
        }
      />
      {/* catch-all for authenticated users */}
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
