import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShoppingCart } from 'lucide-react';
import './login.css'

export default function POSLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setError('');
    
    if (!username || !password) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      if (username === 'admin' && password === 'admin') {
        alert('¡Inicio de sesión exitoso!');
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <ShoppingCart size={36} color="#667eea" />
            </div>
            <h1 className="login-title">Sistema POS</h1>
            <p className="login-subtitle">Punto de Venta</p>
          </div>

          <div className="login-body">
            <div className="form-group">
              <label className="form-label">Usuario</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ingresa tu usuario"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ingresa tu contraseña"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="remember-forgot">
              <label className="remember-label">
                <input type="checkbox" className="remember-checkbox" />
                Recordarme
              </label>
              <button className="forgot-link">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              className="login-button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Ingresando...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>

            <div className="test-credentials">
              <p>
                <strong>Credenciales de prueba:</strong>
                Usuario: admin | Contraseña: admin
              </p>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p className="footer-text">
            © 2024 Sistema POS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
