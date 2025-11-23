import Usuario from '../classes/usuario.js';

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.obtenerTodos();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const desactivarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    await Usuario.desactivar(id);
    res.json({ mensaje: "Usuario desactivado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activarUsuario = async (req, res) => {
  try {
    const id = req.params.id;
    await Usuario.activar(id);
    res.json({ mensaje: "Usuario activado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const actualizar = async (req, res) => {
  try {
    const id = req.params.id; 
    const datosActualizados = req.body;
    const usuarioActualizado = await Usuario.actualizar(id, datosActualizados);
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
