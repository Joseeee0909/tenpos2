import React, { useEffect, useState } from 'react';
import authService from '../services/api.js';
import '../styles/register.css';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRoles = async () => {
    try {
      const rs = await authService.getRoles();
      setRoles(rs);
    } catch (err) {
      console.error('Error cargando roles', err);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('Nombre requerido');
    setLoading(true);
    try {
      await authService.createRole({ nombre, descripcion });
      setNombre('');
      setDescripcion('');
      await loadRoles();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.mensaje || err.message || 'Error al crear rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="form-container">
        <div className="header">
          <h1>Gestionar Roles</h1>
          <p>Crear y listar roles del sistema</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creando...' : 'Crear Rol'}</button>
        </form>

        <hr />
        <h3>Roles existentes</h3>
        <ul>
          {roles.map(r => (
            <li key={r._id}><strong>{r.nombre}</strong> — {r.descripcion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
