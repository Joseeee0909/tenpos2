import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/api";
import "../styles/user.css";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    rol: "",
  });

  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);

useEffect(() => {
  const loadRoles = async () => {
    try {
      const rs = await authService.getRoles();
      // Mapear a { value, label } para usar en select
      setRoles(rs.map(r => ({ value: r.nombre, label: r.nombre })));
    } catch (err) {
      console.error("No se pudieron cargar roles", err);
      setRoles([]);
    }
  };

  loadRoles();
}, []);

  // Cargar usuarios reales del backend
  const loadUsers = async () => {
    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch (err) {
      console.log(err);
      alert("Error cargando usuarios");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Abrir modal para crear
  const handleCreate = () => {
  setEditingUser(null);
  setFormData({
    nombre: "",
    email: "",
    rol: roles[0]?.value || "" // usar value
  });
  setShowModal(true);
};

  // Abrir modal para editar
  const handleEdit = (user) => {
  setEditingUser(user);
  setFormData({
    nombre: user.nombre,
    email: user.email,
    rol: user.rol.nombre || user.rol // si user.rol es objeto, tomar nombre
  });
  setShowModal(true);
};


  // Activar / desactivar usuario
  const handleToggleActive = async (user) => {
    try {
      if (user.activo) {
        await authService.deactivateUser(user._id);
      } else {
        await authService.activateUser(user._id);
      }
      loadUsers();
    } catch (err) {
      alert("No se pudo actualizar el estado");
    }
  };

  // Crear o editar usuario (desde el modal)
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await authService.updateUser(editingUser._id, formData);
      } else {
        await authService.register(formData);
      }

      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert("Error guardando datos");
    }
  };

  const goToRegister = () => navigate("/admin/register");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* ENCABEZADO */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>

            <button
              onClick={goToRegister}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                <path d="M15 14c2.761 0 5 2.239 5 5v1h-2v-1c0-1.654-1.346-3-3-3h-4c-1.654 0-3 1.346-3 3v1H6v-1c0-2.761 2.239-5 5-5h4zM12 3c2.206 0 4 1.794 4 4s-1.794 4-4 4S8 9.206 8 7s1.794-4 4-4zm7 9v2h2v2h-2v2h-2v-2h-2v-2h2v-2h2z" />
              </svg>
              Crear Usuario
            </button>
          </div>

          {/* TABLA */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="th">Id</th>
                  <th className="th">Nombre</th>
                  <th className="th">Email</th>
                  <th className="th">Rol</th>
                  <th className="th">Estado</th>
                  <th className="th">Acciones</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="td">{user.idusuario}</td>
                    <td className="td">{user.nombre}</td>
                    <td className="td">{user.email}</td>
                    <td className="td">
                      <span className={`role ${user.rol.toLowerCase()}`}>
                        {user.rol}
                      </span>
                    </td>
                    <td className="td">
                      <span className={`estado ${user.activo ? "on" : "off"}`}>
                        {user.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="td flex gap-2">
                      {/* EDITAR - Ahora abre el modal */}
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition"
                      >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                        </svg>
                      </button>

                      {/* ACTIVAR/DESACTIVAR */}
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`p-2 rounded transition ${
                          user.activo
                            ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                            : "text-green-600 hover:text-green-900 hover:bg-green-50"
                        }`}
                      >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 3v10h5l-6 7-6-7h5V3z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-bg">
          <div className="modal">
            <h2 className="modal-title">
              {editingUser ? "Editar Usuario" : "Crear Usuario"}
            </h2>

            <form onSubmit={handleSubmit}>
              <label className="label">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="input"
                required
              />

              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                required
              />

              <label className="label">Rol</label>
              <select
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                className="input"
                required
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>


              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-cancel"
                >
                  Cancelar
                </button>

                <button type="submit" className="btn-submit">
                  {editingUser ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;