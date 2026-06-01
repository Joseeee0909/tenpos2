import Usuario from '../classes/usuario.js';
import { pickFields, toBoolean, toTrimmedString } from '../utils/requestPayload.js';

const USER_UPDATE_FIELDS = ['idusuario', 'nombre', 'username', 'email', 'password', 'rol', 'activo'];

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.obtenerTodos(req.user.empresaId);
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const desactivarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    await Usuario.desactivar(id, req.user.empresaId);
    res.json({ mensaje: "Usuario desactivado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    await Usuario.activar(id, req.user.empresaId);
    res.json({ mensaje: "Usuario activado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const actualizar = async (req, res) => {
  try {
    const id = req.params.id; 
    const datosActualizados = pickFields(req.body, USER_UPDATE_FIELDS);

    if ('nombre' in datosActualizados) datosActualizados.nombre = toTrimmedString(datosActualizados.nombre);
    if ('username' in datosActualizados) datosActualizados.username = toTrimmedString(datosActualizados.username);
    if ('email' in datosActualizados) datosActualizados.email = toTrimmedString(datosActualizados.email);
    if ('rol' in datosActualizados) datosActualizados.rol = toTrimmedString(datosActualizados.rol);
    if ('activo' in datosActualizados) datosActualizados.activo = toBoolean(datosActualizados.activo, true);

    const usuarioActualizado = await Usuario.actualizar(id, req.user.empresaId, datosActualizados);
    res.json(usuarioActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export default {
  listarUsuarios,
  desactivarUsuario,
  activarUsuario,
  actualizar
};
