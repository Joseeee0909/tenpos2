import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { UxToast } from '../components/UXFeedback';
import authService from '../services/api';
import '../styles/user.css';

const ROLE_THEME = {
  root: { tagBg: '#fef9c3', tagText: '#854d0e', avatar: '#b45309', dot: '#eab308' },
  admin: { tagBg: '#eef2ff', tagText: '#3730a3', avatar: '#4f46e5', dot: '#6366f1' },
  cajero: { tagBg: '#f0fdf4', tagText: '#15803d', avatar: '#16a34a', dot: '#22c55e' },
  mesero: { tagBg: '#fff7ed', tagText: '#c2410c', avatar: '#ea580c', dot: '#f97316' },
  cocina: { tagBg: '#fdf4ff', tagText: '#7e22ce', avatar: '#9333ea', dot: '#a855f7' }
};

const emptyForm = {
  nombre: '',
  username: '',
  email: '',
  rol: '',
  password: ''
};

const cap = (value) => {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

const roleKey = (value) => String(value || '').trim().toLowerCase();

const hash = (text) =>
  String(text || '')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

const dynamicRoleTheme = (role) => {
  const key = roleKey(role);
  if (ROLE_THEME[key]) return ROLE_THEME[key];
  const hue = hash(key) % 360;
  return {
    tagBg: `hsl(${hue} 85% 95%)`,
    tagText: `hsl(${hue} 70% 30%)`,
    avatar: `hsl(${hue} 70% 46%)`,
    dot: `hsl(${hue} 75% 48%)`
  };
};

const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'U';

const buildId = () => `U-${Date.now().toString().slice(-6)}`;

const buildUsername = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '.');

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [notice, setNotice] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const loadRoles = async () => {
    try {
      const data = await authService.getRoles();
      const roleValues = (Array.isArray(data) ? data : [])
        .map((role) => String(role?.nombre || role || '').trim())
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index);

      const values = roleValues.length > 0 ? roleValues : ['mesero'];
      setRoles(values.map((value) => ({ value, label: cap(value) })));
    } catch (error) {
      console.error('No se pudieron cargar roles', error);
      setRoles([{ value: 'mesero', label: 'Mesero' }]);
      pushNotice('No se pudieron cargar los roles. Se usa rol por defecto.', 'warning');
    }
  };

  const loadUsers = async () => {
    try {
      const data = await authService.getUsers();
      const normalized = (Array.isArray(data) ? data : []).map((user) => ({
        _id: user._id,
        idusuario: user.idusuario || `ID-${String(user._id || '').slice(-4).toUpperCase()}`,
        nombre: user.nombre || 'Usuario',
        username: user.username || '',
        email: user.email || '-',
        rol: String(user.rol?.nombre || user.rol || 'sin-rol'),
        activo: user.activo !== false
      }));
      setUsers(normalized);
    } catch (error) {
      console.error(error);
      setUsers([]);
      pushNotice('No se pudieron cargar los usuarios.', 'error');
    }
  };

  useEffect(() => {
    loadRoles();
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const byRole = roleFilter === 'all' || user.rol === roleFilter;
      const bySearch =
        !q ||
        user.nombre.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.rol.toLowerCase().includes(q) ||
        String(user.idusuario || '').toLowerCase().includes(q);

      return byRole && bySearch;
    });
  }, [users, searchTerm, roleFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.activo).length,
      inactive: users.filter((user) => !user.activo).length,
      admins: users.filter((user) => ['root', 'admin', 'administrador'].includes(roleKey(user.rol))).length
    }),
    [users]
  );

  const validateField = (name, value) => {
    const raw = String(value || '').trim();

    if (name === 'nombre') {
      if (!raw) return 'El nombre es obligatorio.';
      if (raw.length < 3) return 'Debe tener al menos 3 caracteres.';
      return '';
    }

    if (name === 'username') {
      if (!raw) return 'El username es obligatorio.';
      if (!/^[a-z0-9._-]{4,}$/i.test(raw)) return 'Minimo 4 caracteres (letras, numeros, punto, guion o guion bajo).';
      return '';
    }

    if (name === 'email') {
      if (!raw) return 'El correo es obligatorio.';
      if (!/^\S+@\S+\.\S+$/.test(raw)) return 'Ingresa un correo valido.';
      return '';
    }

    if (name === 'rol') {
      if (!raw) return 'Selecciona un rol.';
      return '';
    }

    if (name === 'password') {
      if (!editingUser && raw.length < 6) return 'La contrasena debe tener al menos 6 caracteres.';
      if (editingUser && raw && raw.length < 6) return 'Si cambias la contrasena, debe tener al menos 6 caracteres.';
      return '';
    }

    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      nombre: validateField('nombre', formData.nombre),
      username: validateField('username', formData.username),
      email: validateField('email', formData.email),
      rol: validateField('rol', formData.rol),
      password: validateField('password', formData.password)
    };

    setFormErrors(nextErrors);
    return Object.values(nextErrors).every((err) => !err);
  };

  const resetForm = (initial = {}) => {
    setFormData({
      ...emptyForm,
      rol: roles[0]?.value || '',
      ...initial
    });
    setFormErrors({});
    setShowPassword(false);
  };

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setEditorOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    resetForm({
      nombre: user.nombre,
      username: user.username,
      email: user.email,
      rol: user.rol,
      password: ''
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingUser(null);
    setFormErrors({});
    setSaving(false);
  };

  const openToggle = (user) => {
    setToggleTarget(user);
    setToggleOpen(true);
  };

  const closeToggle = () => {
    setToggleTarget(null);
    setToggleOpen(false);
    setToggling(false);
  };

  const onFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      if (name === 'nombre' && !editingUser) {
        const generated = buildUsername(value);
        return {
          ...prev,
          nombre: value,
          username: prev.username || generated
        };
      }

      return { ...prev, [name]: value };
    });

    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const onRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, rol: role }));
    setFormErrors((prev) => ({ ...prev, rol: validateField('rol', role) }));
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    const basePayload = {
      idusuario: editingUser ? editingUser.idusuario : buildId(),
      nombre: formData.nombre.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      rol: formData.rol
    };

    if (formData.password.trim()) {
      basePayload.password = formData.password.trim();
    }

    setSaving(true);
    try {
      if (editingUser) {
        await authService.updateUser(editingUser._id, basePayload);
        pushNotice('Usuario actualizado correctamente.', 'success');
      } else {
        await authService.register({ ...basePayload, activo: true });
        pushNotice('Usuario creado correctamente.', 'success');
      }

      closeEditor();
      await loadUsers();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      const msg = error.response?.data?.mensaje || error.response?.data?.error;
      pushNotice(msg || 'No se pudo guardar el usuario.', 'error');
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;

    setToggling(true);
    try {
      if (toggleTarget.activo) {
        await authService.deactivateUser(toggleTarget._id);
      } else {
        await authService.activateUser(toggleTarget._id);
      }

      pushNotice(
        toggleTarget.activo
          ? 'Usuario desactivado correctamente.'
          : 'Usuario reactivado correctamente.',
        'success'
      );

      closeToggle();
      await loadUsers();
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error);
      pushNotice('No se pudo actualizar el estado del usuario.', 'error');
      setToggling(false);
    }
  };

  return (
    <div className="users-v3 app">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <PageHeader
        label="Gestion de usuarios"
        title="Gestion de usuarios"
        subtitle={`${stats.total} usuarios registrados`}
        iconColor="#4f46e5"
        icon={(
          <svg viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.7">
            <circle cx="9" cy="6" r="4" />
            <path d="M2 18c0-4 3-6 7-6s7 2 7 6" />
            <path d="M17 10v6M14 13h6" />
          </svg>
        )}
        actions={(
          <button className="users-btn-solid" type="button" onClick={openCreate}>
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Crear usuario
          </button>
        )}
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0f0fc' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#4f46e5" strokeWidth="1.6"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" /></svg>
          </div>
          <div><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total usuarios</div></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.8"><circle cx="8" cy="8" r="6" /><path d="M5 8.5l2.5 2.5 4-5" /></svg>
          </div>
          <div><div className="stat-num">{stats.active}</div><div className="stat-lbl">Activos</div></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff5f5' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.8"><circle cx="8" cy="8" r="6" /><path d="M6 6l4 4M10 6l-4 4" /></svg>
          </div>
          <div><div className="stat-num">{stats.inactive}</div><div className="stat-lbl">Inactivos</div></div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fefce8' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#ca8a04" strokeWidth="1.6"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5z" /></svg>
          </div>
          <div><div className="stat-num">{stats.admins}</div><div className="stat-lbl">Admins / Root</div></div>
        </div>
      </div>

      <div className="toolbar-wrap">
        <div className="search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5" /><path d="m11 11 2.5 2.5" /></svg>
          <input
            type="text"
            placeholder="Buscar por nombre, username, email o rol..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="chips">
          <button className={`chip ${roleFilter === 'all' ? 'on' : ''}`} type="button" onClick={() => setRoleFilter('all')}><span className="chip-dot" style={{ background: '#818cf8' }}></span>Todos</button>
          {roles.map((role) => (
            <button key={role.value} className={`chip ${roleFilter === role.value ? 'on' : ''}`} type="button" onClick={() => setRoleFilter(role.value)}>
              <span className="chip-dot" style={{ background: dynamicRoleTheme(role.value).dot }}></span>
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-area">
        {filteredUsers.length === 0 ? (
          <div className="empty">
            <div className="empty-i"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" /></svg></div>
            <div className="empty-t">Sin resultados</div>
            <div className="empty-s">Prueba con otro filtro o busqueda</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '230px' }}>Usuario</th>
                  <th style={{ minWidth: '180px' }}>Username</th>
                  <th style={{ minWidth: '220px' }}>Email</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center', minWidth: '95px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const roleTheme = dynamicRoleTheme(user.rol);
                  return (
                    <tr key={user._id} className={`urow ${user.activo ? '' : 'off'}`}>
                      <td>
                        <div className="user-cell">
                          <div
                            className="avatar"
                            style={{
                              background: roleTheme.avatar,
                              filter: user.activo ? 'none' : 'grayscale(1)'
                            }}
                          >
                            {initials(user.nombre)}
                          </div>
                          <div>
                            <div className="uname">{user.nombre}</div>
                            <div className="uid">{user.idusuario}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="username-chip">@{user.username}</span></td>
                      <td><span className="uemail">{user.email}</span></td>
                      <td><span className="role-tag" style={{ background: roleTheme.tagBg, color: roleTheme.tagText }}>{cap(user.rol)}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="status-dot-wrap" style={{ justifyContent: 'center', color: user.activo ? '#16a34a' : '#94a3b8' }}>
                          <span className="sdot" style={{ background: user.activo ? '#22c55e' : '#cbd5e1' }}></span>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </div>
                      </td>
                      <td>
                        <div className="act-cell">
                          <button className="act-btn" type="button" onClick={() => openEdit(user)}>
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 2l3 3-8 8H3v-3z" /></svg>
                          </button>
                          <button
                            className={`act-btn ${user.activo ? 'deact' : 'react'}`}
                            type="button"
                            onClick={() => openToggle(user)}
                          >
                            {user.activo ? (
                              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M6 6l4 4M10 6l-4 4" /></svg>
                            ) : (
                              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="overlay" onClick={closeEditor}>
          <div className="mbox" onClick={(event) => event.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{editingUser ? 'Editar usuario' : 'Crear usuario'}</span>
              <button className="mclose" type="button" onClick={closeEditor}>x</button>
            </div>

            <div className="mbody">
              <div className="frow">
                <label className="flbl">Rol</label>
                <div className={`role-picker ${formErrors.rol ? 'invalid' : ''}`}>
                  {roles.map((role) => {
                    const roleTheme = dynamicRoleTheme(role.value);
                    const isOn = formData.rol === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        className={`role-option ${isOn ? 'on' : ''}`}
                        onClick={() => onRoleSelect(role.value)}
                        style={isOn ? { background: roleTheme.avatar } : {}}
                      >
                        <span className="role-dot" style={{ background: roleTheme.dot }}></span>
                        {role.label}
                      </button>
                    );
                  })}
                </div>
                {formErrors.rol ? <div className="field-err">{formErrors.rol}</div> : null}
              </div>

              <div className="f2">
                <div>
                  <label className="flbl" htmlFor="f-name">Nombre completo</label>
                  <input id="f-name" className={`finput ${formErrors.nombre ? 'invalid' : ''}`} name="nombre" value={formData.nombre} onChange={onFormChange} placeholder="Ej: Carlos Mendoza" />
                  {formErrors.nombre ? <div className="field-err">{formErrors.nombre}</div> : null}
                </div>
                <div>
                  <label className="flbl" htmlFor="f-username">Username</label>
                  <input id="f-username" className={`finput ${formErrors.username ? 'invalid' : ''}`} name="username" value={formData.username} onChange={onFormChange} placeholder="carlos.mendoza" />
                  {formErrors.username ? <div className="field-err">{formErrors.username}</div> : null}
                </div>
              </div>

              <div className="frow">
                <label className="flbl" htmlFor="f-email">Correo electronico</label>
                <input id="f-email" className={`finput ${formErrors.email ? 'invalid' : ''}`} name="email" type="email" value={formData.email} onChange={onFormChange} placeholder="usuario@tenpos.com" />
                {formErrors.email ? <div className="field-err">{formErrors.email}</div> : null}
              </div>

              <div className="frow">
                <label className="flbl" htmlFor="f-pass">{editingUser ? 'Nueva contrasena (opcional)' : 'Contrasena'}</label>
                <div className="pwrap">
                  <input
                    id="f-pass"
                    className={`finput ${formErrors.password ? 'invalid' : ''}`}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={onFormChange}
                    placeholder={editingUser ? 'Dejar vacio para no cambiar' : 'Minimo 6 caracteres'}
                  />
                  <button className="peye" type="button" onClick={() => setShowPassword((prev) => !prev)}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="8" rx="5" ry="3.5" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></svg>
                  </button>
                </div>
                {formErrors.password ? <div className="field-err">{formErrors.password}</div> : null}
              </div>
            </div>

            <div className="mfoot">
              <button type="button" className="mfc" onClick={closeEditor}>Cancelar</button>
              <button type="button" className="mfs" onClick={saveUser} disabled={saving}>
                {saving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toggleOpen && toggleTarget && (
        <div className="overlay" onClick={closeToggle}>
          <div className="mbox" onClick={(event) => event.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{toggleTarget.activo ? 'Desactivar usuario' : 'Reactivar usuario'}</span>
              <button className="mclose" type="button" onClick={closeToggle}>x</button>
            </div>

            <div className="mbody">
              <div className="warn">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 10.5v.5" /></svg>
                <p>
                  {toggleTarget.activo
                    ? `El usuario ${toggleTarget.nombre} quedara inactivo y no podra acceder al sistema.`
                    : `El usuario ${toggleTarget.nombre} volvera a tener acceso activo al sistema.`}
                </p>
              </div>

              <div className="uprev">
                <div className="avatar" style={{ background: dynamicRoleTheme(toggleTarget.rol).avatar, width: '44px', height: '44px', borderRadius: '11px', fontSize: '15px' }}>{initials(toggleTarget.nombre)}</div>
                <div>
                  <div className="uprev-name">{toggleTarget.nombre}</div>
                  <div className="uprev-meta">
                    @{toggleTarget.username} · <span style={{ color: dynamicRoleTheme(toggleTarget.rol).tagText, fontWeight: 600 }}>{cap(toggleTarget.rol)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mfoot">
              <button type="button" className="mfc" onClick={closeToggle}>Cancelar</button>
              <button
                type="button"
                className={toggleTarget.activo ? 'mfd' : 'mfg'}
                onClick={confirmToggle}
                disabled={toggling}
              >
                {toggling ? 'Procesando...' : toggleTarget.activo ? 'Si, desactivar' : 'Si, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
