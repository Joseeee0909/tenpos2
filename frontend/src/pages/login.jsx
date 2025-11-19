
import { useState, useContext } from 'react';
import authService from '../services/api.js';
import { AuthContext } from '../context/AuthContext';
import '../styles/login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: contextLogin } = useContext(AuthContext) || {};

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    try {
      const data = await authService.login(username, password);
      console.log('Respuesta del servidor:', data);
      // If AuthContext is available, call its login; otherwise fall back to localStorage
      if (typeof contextLogin === 'function') {
        contextLogin({ token: data.token, usuario: data.usuario });
      } else {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.usuario) localStorage.setItem('usuario', JSON.stringify(data.usuario));
      }

      alert(`${data.mensaje || 'Bienvenido'}, ${data.usuario?.username || username}!`);
      
      // Redirigir siempre a la pantalla de inicio (menu) tras login exitoso
      window.location.href = '/menu';
      
    } catch (err) {
      console.error('Error en login:', err);
      
      if (err.response) {
        const mensaje = err.response.data.mensaje || err.response.data.error;
        
        if (err.response.status === 404) {
          setError('Usuario no encontrado');
        } else if (err.response.status === 401) {
          setError('Contraseña incorrecta');
        } else {
          setError(mensaje || 'Error al iniciar sesión');
        }
      } else if (err.request) {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      } else {
        setError('Error al procesar la solicitud');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="header">
          <div className="icon-container">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="title">Sistema TenPos</h1>
          <p className="subtitle">Ingresa tus credenciales para continuar</p>
        </div>

        <div className="form-container">
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <div className="input-group">
            <label className="label" htmlFor="username">
              Usuario
            </label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ingresa tu usuario"
                className="input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ingresa tu contraseña"
                className="input"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="eye-button"
                disabled={loading}
              >
                {showPassword ? (
                  <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>

          <div className="footer">
            <a href="#" className="link">¿Olvidaste tu contraseña?</a>
          </div>
        </div>
      </div>
    </div>
  );
}
