// UserRegistration.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/api.js';
import '../styles/register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    idusuario: '',
    nombre: '',
    username: '',
    password: '',
    email: '',
    rol: ''
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const rs = await authService.getRoles();
        // rs is array of { _id, nombre, descripcion }
        setRoles(rs.map(r => ({ value: r.nombre, label: r.nombre, descripcion: r.descripcion })));
      } catch (err) {
        console.error('No se pudieron cargar roles', err);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
     if (!formData.idusuario.trim()) {
      newErrors.idusuario = 'El id es requerido';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 4) {
      newErrors.username = 'El username debe tener al menos 4 caracteres';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.rol) {
      newErrors.rol = 'Debe seleccionar un rol';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        // Llamar al backend para registrar
        const data = await authService.register(formData);
        console.log('Registro backend:', data);
        setSubmitted(true);

        // Limpiar form
        setFormData({
          idusuario: '',
          nombre: '',
          username: '',
          password: '',
          email: '',
          rol: ''
        });

        // Redirigir al login después de 2s
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } catch (err) {
        console.error('Error registrando usuario:', err);
        if (err.response) {
          setServerError(err.response.data.mensaje || err.response.data.error || 'Error al registrar');
        } else if (err.request) {
          setServerError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
        } else {
          setServerError('Error al procesar la solicitud');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="app-container">
      <div className="form-container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div className="header">
            <div className="header-icon"></div>
            <h1>Registro de Usuario</h1>
            <p>Complete el formulario para crear una cuenta</p>
          </div>
          <Link to="/admin/roles" style={{
            marginLeft: 12,
            padding: '8px 12px',
            background: '#667eea',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600
          }}>Crear roles</Link>
        </div>

        {submitted && (
          <div className="success-message">
            ✓ Usuario registrado exitosamente
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="id">ID Usuario</label>
            <div className="input-wrapper">
              <span className="input-icon"></span>
              <input
                type="text"
                id="idusuario"
                name="idusuario"
                value={formData.idusuario}
                onChange={handleChange}
                className={`form-input ${errors.idusuario ? 'error' : ''}`}
                placeholder="Id-12345"
              />
            </div>
            {errors.nombre && <div className="error-message">{errors.nombre}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <div className="input-wrapper">
              <span className="input-icon"></span>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                placeholder="Juan Pérez"
              />
            </div>
            {errors.nombre && <div className="error-message">{errors.nombre}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <div className="input-wrapper">
              <span className="input-icon"></span>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="juanperez"
              />
            </div>
            {errors.username && <div className="error-message">{errors.username}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon"></span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="juan@ejemplo.com"
              />
            </div>
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon"></span>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label>Rol</label>
            <div className="roles-container">
              {roles.length === 0 ? (
                <div>No hay roles disponibles. Pide a un administrador que cree roles.</div>
              ) : (
                roles.map(role => (
                  <div key={role.value} className="role-option">
                    <input
                      type="radio"
                      id={role.value}
                      name="rol"
                      value={role.value}
                      checked={formData.rol === role.value}
                      onChange={handleChange}
                      className="role-input"
                    />
                    <label htmlFor={role.value} className="role-label">
                      <span className="role-icon">👤</span>
                      <span className="role-name">{role.label}</span>
                    </label>
                  </div>
                ))
              )}
            </div>
            {errors.rol && <div className="error-message">{errors.rol}</div>}
          </div>

          <button type="submit" className="submit-btn">
            Registrar Usuario
          </button>
        </form>
      </div>
    </div>
  );
}