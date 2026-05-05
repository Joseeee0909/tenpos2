import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { UxToast } from '../components/UXFeedback';
import authService from '../services/api';
import '../styles/roles.css';

const ALL_PERMS = [
  { id: 'ver_pedidos', label: 'Ver pedidos', desc: 'Consultar lista y detalle' },
  { id: 'crear_pedidos', label: 'Crear pedidos', desc: 'Registrar nuevos pedidos' },
  { id: 'editar_pedidos', label: 'Editar pedidos', desc: 'Modificar pedidos existentes' },
  { id: 'ver_productos', label: 'Ver productos', desc: 'Consultar catalogo' },
  { id: 'gestionar_productos', label: 'Gestionar productos', desc: 'Crear, editar, desactivar' },
  { id: 'ver_mesas', label: 'Ver mesas', desc: 'Consultar estado de mesas' },
  { id: 'gestionar_mesas', label: 'Gestionar mesas', desc: 'Crear y editar mesas' },
  { id: 'ver_usuarios', label: 'Ver usuarios', desc: 'Consultar lista de usuarios' },
  { id: 'gestionar_usuarios', label: 'Gestionar usuarios', desc: 'Crear, editar y desactivar' },
  { id: 'gestionar_roles', label: 'Gestionar roles', desc: 'Crear y editar roles' }
];

const COLORS = ['#7c3aed', '#4f46e5', '#0369a1', '#0f766e', '#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#9333ea'];

const EMOJIS = {
  root: '👑',
  admin: '🛡️',
  cajero: '💰',
  mesero: '🍽️',
  cocina: '👨‍🍳'
};

const emptyForm = {
  nombre: '',
  descripcion: '',
  color: COLORS[0],
  permisos: []
};

const normalize = (text) => String(text || '').trim().toLowerCase();

const cap = (text) => {
  const value = String(text || '').trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
};

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleRole, setToggleRole] = useState(null);
  const [toggling, setToggling] = useState(false);

  const [notice, setNotice] = useState(null);

  const pushNotice = (message, type = 'info') => {
    setNotice({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const loadData = async () => {
    try {
      const [rolesData, usersData] = await Promise.all([authService.getRoles(), authService.getUsers()]);

      setUsers(Array.isArray(usersData) ? usersData : []);

      const normalizedRoles = (Array.isArray(rolesData) ? rolesData : []).map((role) => ({
        _id: role._id,
        idrol: role.idrol,
        nombre: role.nombre || 'Rol',
        descripcion: role.descripcion || 'Sin descripcion',
        color: role.color || COLORS[0],
        permisos: Array.isArray(role.permisos) ? role.permisos : [],
        activo: role.activo !== false
      }));

      setRoles(normalizedRoles);
    } catch (error) {
      console.error('Error cargando roles:', error);
      setRoles([]);
      setUsers([]);
      pushNotice('No se pudieron cargar los roles.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const usersByRole = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      const key = normalize(user.rol?.nombre || user.rol);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [users]);

  const rolesWithUsers = useMemo(
    () => roles.map((role) => ({ ...role, usersCount: usersByRole[normalize(role.nombre)] || 0 })),
    [roles, usersByRole]
  );

  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rolesWithUsers;
    return rolesWithUsers.filter((role) => role.nombre.toLowerCase().includes(q) || role.descripcion.toLowerCase().includes(q));
  }, [rolesWithUsers, searchTerm]);

  const stats = useMemo(() => {
    const totalUsersAssigned = rolesWithUsers.reduce((sum, role) => sum + role.usersCount, 0);
    return {
      total: rolesWithUsers.length,
      active: rolesWithUsers.filter((role) => role.activo).length,
      users: totalUsersAssigned,
      fullAccess: rolesWithUsers.filter((role) => role.permisos.length === ALL_PERMS.length).length
    };
  }, [rolesWithUsers]);

  const validateField = (name, value) => {
    const raw = String(value || '').trim();

    if (name === 'nombre') {
      if (!raw) return 'El nombre del rol es obligatorio.';
      if (raw.length < 3) return 'Debe tener al menos 3 caracteres.';
      return '';
    }

    if (name === 'descripcion') {
      if (!raw) return 'La descripcion es obligatoria.';
      if (raw.length < 8) return 'Describe un poco mas este rol (minimo 8 caracteres).';
      return '';
    }

    if (name === 'color') {
      if (!raw) return 'Debes seleccionar un color.';
      return '';
    }

    if (name === 'permisos') {
      if (!Array.isArray(value) || value.length === 0) return 'Selecciona al menos un permiso.';
      return '';
    }

    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      nombre: validateField('nombre', formData.nombre),
      descripcion: validateField('descripcion', formData.descripcion),
      color: validateField('color', formData.color),
      permisos: validateField('permisos', formData.permisos)
    };

    setFormErrors(nextErrors);
    return Object.values(nextErrors).every((err) => !err);
  };

  const openNew = () => {
    setEditingRole(null);
    setFormData(emptyForm);
    setFormErrors({});
    setEditorOpen(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormData({
      nombre: role.nombre,
      descripcion: role.descripcion,
      color: role.color || COLORS[0],
      permisos: Array.isArray(role.permisos) ? role.permisos : []
    });
    setFormErrors({});
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingRole(null);
    setSaving(false);
    setFormErrors({});
  };

  const onFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const togglePerm = (permId) => {
    setFormData((prev) => {
      const set = new Set(prev.permisos);
      if (set.has(permId)) set.delete(permId);
      else set.add(permId);
      const permisos = [...set];
      setFormErrors((prevErr) => ({ ...prevErr, permisos: validateField('permisos', permisos) }));
      return { ...prev, permisos };
    });
  };

  const saveRole = async () => {
    if (!validateForm()) return;

    const payload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      color: formData.color,
      permisos: formData.permisos
    };

    setSaving(true);
    try {
      if (editingRole) {
        await authService.updateRole(editingRole._id, payload);
        pushNotice('Rol actualizado correctamente.', 'success');
      } else {
        await authService.createRole(payload);
        pushNotice('Rol creado correctamente.', 'success');
      }

      closeEditor();
      await loadData();
    } catch (error) {
      console.error('Error guardando rol:', error);
      const msg = error.response?.data?.mensaje || error.response?.data?.error;
      pushNotice(msg || 'No se pudo guardar el rol.', 'error');
      setSaving(false);
    }
  };

  const openToggle = (role) => {
    setToggleRole(role);
    setToggleOpen(true);
  };

  const closeToggle = () => {
    setToggleRole(null);
    setToggleOpen(false);
    setToggling(false);
  };

  const confirmToggle = async () => {
    if (!toggleRole) return;

    setToggling(true);
    try {
      if (toggleRole.activo) {
        await authService.deactivateRole(toggleRole._id);
      } else {
        await authService.activateRole(toggleRole._id);
      }

      pushNotice(toggleRole.activo ? 'Rol desactivado correctamente.' : 'Rol reactivado correctamente.', 'success');
      closeToggle();
      await loadData();
    } catch (error) {
      console.error('Error cambiando estado del rol:', error);
      pushNotice('No se pudo actualizar el estado del rol.', 'error');
      setToggling(false);
    }
  };

  return (
    <div className="roles-v3 app">
      <UxToast notice={notice} onClose={() => setNotice(null)} />

      <PageHeader
        label="Gestion de roles"
        title="Gestion de roles"
        subtitle={`${stats.total} roles registrados`}
        iconColor="#7c3aed"
        icon={(
          <svg viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.7"><path d="M11 3l2 4h5l-4 3 1.5 4.5L11 12l-4.5 2.5L8 10 4 7h5z" /></svg>
        )}
        actions={(
          <button className="ph-btn" type="button" onClick={openNew}>
            <svg viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" /></svg>
            Nuevo rol
          </button>
        )}
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f5f3ff' }}><svg viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="1.6"><path d="M8 2l2 4h4l-3 2.5 1 4L8 10l-4 2.5 1-4L2 6h4z" /></svg></div>
          <div><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total roles</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}><svg viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.8"><circle cx="8" cy="8" r="6" /><path d="M5 8.5l2.5 2.5 4-5" /></svg></div>
          <div><div className="stat-num">{stats.active}</div><div className="stat-lbl">Activos</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff' }}><svg viewBox="0 0 16 16" fill="none" stroke="#4f46e5" strokeWidth="1.6"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" /></svg></div>
          <div><div className="stat-num">{stats.users}</div><div className="stat-lbl">Usuarios asignados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef9c3' }}><svg viewBox="0 0 16 16" fill="none" stroke="#ca8a04" strokeWidth="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" /></svg></div>
          <div><div className="stat-num">{stats.fullAccess}</div><div className="stat-lbl">Roles con acceso total</div></div>
        </div>
      </div>

      <div className="toolbar-wrap">
        <div className="search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5" /><path d="m11 11 2.5 2.5" /></svg>
          <input
            type="text"
            placeholder="Buscar rol por nombre o descripcion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredRoles.length === 0 ? (
        <div className="empty">
          <div className="empty-i"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l2 4h4l-3 2.5 1 4L8 10l-4 2.5 1-4L2 6h4z" /></svg></div>
          <div className="empty-t">Sin resultados</div>
          <div className="empty-s">Prueba con otro termino de busqueda</div>
        </div>
      ) : (
        <div className="roles-grid">
          {filteredRoles.map((role) => {
            const shown = role.permisos.slice(0, 4);
            const extra = Math.max(0, role.permisos.length - 4);
            const icon = EMOJIS[normalize(role.nombre)] || '🔑';

            return (
              <div key={role._id} className={`role-card ${role.activo ? '' : 'off'}`}>
                <div className="role-card-top">
                  <div className="role-color-dot" style={{ background: `${role.color}20` }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                  </div>
                  <div className="role-card-info">
                    <div className="role-name">{cap(role.nombre)}</div>
                    <div className="role-desc">{role.descripcion}</div>
                    <span className="status-pill" style={{ background: role.activo ? '#f0fdf4' : '#f1f5f9', color: role.activo ? '#16a34a' : '#94a3b8', marginTop: '8px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: role.activo ? '#22c55e' : '#cbd5e1', display: 'inline-block' }}></span>
                      {role.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="perms-section">
                  <div className="perms-label">Permisos ({role.permisos.length}/{ALL_PERMS.length})</div>
                  <div className="perms-list">
                    {shown.map((permId) => {
                      const perm = ALL_PERMS.find((item) => item.id === permId);
                      if (!perm) return null;
                      return (
                        <span key={permId} className="perm-chip" style={{ background: `${role.color}15`, color: role.color }}>
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 6.5l3 3 5-5" /></svg>
                          {perm.label}
                        </span>
                      );
                    })}
                    {extra > 0 ? <span className="perm-chip" style={{ background: '#f1f5f9', color: '#64748b' }}>+{extra} mas</span> : null}
                  </div>
                </div>

                <div className="role-card-footer">
                  <div className="role-users">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="2.5" /><path d="M1 13c0-2.8 2.2-4 5-4" /><circle cx="11" cy="5" r="2.5" /><path d="M8 13c0-2.8 2.2-4 5-4" /></svg>
                    {role.usersCount} usuario{role.usersCount !== 1 ? 's' : ''} asignado{role.usersCount !== 1 ? 's' : ''}
                  </div>
                  <div className="role-actions">
                    <button className="act-btn" type="button" title="Editar" onClick={() => openEdit(role)}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 2l3 3-8 8H3v-3z" /></svg>
                    </button>
                    <button className={`act-btn ${role.activo ? 'deact' : 'react'}`} type="button" title={role.activo ? 'Desactivar' : 'Reactivar'} onClick={() => openToggle(role)}>
                      {role.activo ? (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M6 6l4 4M10 6l-4 4" /></svg>
                      ) : (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8.5l3.5 3.5 6.5-7" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <div className="overlay" onClick={closeEditor}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{editingRole ? 'Editar rol' : 'Nuevo rol'}</span>
              <button className="mclose" type="button" onClick={closeEditor}>x</button>
            </div>

            <div className="mbody">
              <div className="f2">
                <div>
                  <label className="flbl" htmlFor="f-name">Nombre del rol</label>
                  <input
                    id="f-name"
                    className={`finput ${formErrors.nombre ? 'invalid' : ''}`}
                    value={formData.nombre}
                    onChange={(e) => onFieldChange('nombre', e.target.value)}
                    placeholder="Ej: Supervisor"
                  />
                  {formErrors.nombre ? <div className="field-err">{formErrors.nombre}</div> : null}
                </div>

                <div>
                  <label className="flbl">Color</label>
                  <div className={`color-picker ${formErrors.color ? 'invalid' : ''}`}>
                    {COLORS.map((color) => (
                      <button key={color} className={`color-opt ${formData.color === color ? 'sel' : ''}`} style={{ background: color }} type="button" onClick={() => onFieldChange('color', color)}>
                        <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2"><path d="M2.5 7l3 3 6-6" /></svg>
                      </button>
                    ))}
                  </div>
                  {formErrors.color ? <div className="field-err">{formErrors.color}</div> : null}
                </div>
              </div>

              <div className="frow">
                <label className="flbl" htmlFor="f-desc">Descripcion</label>
                <textarea
                  id="f-desc"
                  className={`ftextarea ${formErrors.descripcion ? 'invalid' : ''}`}
                  value={formData.descripcion}
                  onChange={(e) => onFieldChange('descripcion', e.target.value)}
                  placeholder="Describe las responsabilidades de este rol..."
                ></textarea>
                {formErrors.descripcion ? <div className="field-err">{formErrors.descripcion}</div> : null}
              </div>

              <div className="frow">
                <label className="flbl">Permisos</label>
                <div className={`perms-grid ${formErrors.permisos ? 'invalid' : ''}`}>
                  {ALL_PERMS.map((perm) => {
                    const checked = formData.permisos.includes(perm.id);
                    return (
                      <label key={perm.id} className={`perm-check ${checked ? 'checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => togglePerm(perm.id)} />
                        <div className="perm-check-label">{perm.label}<span>{perm.desc}</span></div>
                      </label>
                    );
                  })}
                </div>
                {formErrors.permisos ? <div className="field-err">{formErrors.permisos}</div> : null}
              </div>
            </div>

            <div className="mfoot">
              <button className="mfc" type="button" onClick={closeEditor}>Cancelar</button>
              <button className="mfs" type="button" onClick={saveRole} disabled={saving}>
                {saving ? 'Guardando...' : editingRole ? 'Guardar cambios' : 'Crear rol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toggleOpen && toggleRole && (
        <div className="overlay" onClick={closeToggle}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <span className="mtitle">{toggleRole.activo ? 'Desactivar rol' : 'Reactivar rol'}</span>
              <button className="mclose" type="button" onClick={closeToggle}>x</button>
            </div>

            <div className="mbody">
              <div className="warn">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 10.5v.5" /></svg>
                <p>
                  {toggleRole.activo
                    ? `El rol ${toggleRole.nombre} quedara inactivo. Los usuarios con este rol perderan acceso hasta que se reactive.`
                    : `El rol ${toggleRole.nombre} volvera a estar activo y sus usuarios recuperaran el acceso.`}
                </p>
              </div>

              <div className="rprev">
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${toggleRole.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {EMOJIS[normalize(toggleRole.nombre)] || '🔑'}
                </div>
                <div>
                  <div className="rprev-name">{toggleRole.nombre}</div>
                  <div className="rprev-meta">{toggleRole.permisos.length} permisos · {toggleRole.usersCount} usuario{toggleRole.usersCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>

            <div className="mfoot">
              <button className="mfc" type="button" onClick={closeToggle}>Cancelar</button>
              <button className={toggleRole.activo ? 'mfd' : 'mfg'} type="button" onClick={confirmToggle} disabled={toggling}>
                {toggling ? 'Procesando...' : toggleRole.activo ? 'Si, desactivar' : 'Si, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
