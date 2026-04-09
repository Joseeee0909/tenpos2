import Rol from '../classes/rol.js';
import RolModel from '../models/rol.model.js';

class RolController {
  static async crearRol(req, res) {
    try {
      const { nombre, descripcion, color, permisos } = req.body;
      if (!nombre) return res.status(400).json({ mensaje: 'El nombre del rol es requerido' });

      // evitar duplicados
      const existente = await RolModel.findOne({ nombre });
      if (existente) return res.status(409).json({ mensaje: 'El rol ya existe' });

      const nuevo = new Rol(nombre, descripcion || '', color || '#7c3aed', Array.isArray(permisos) ? permisos : []);
      const saved = await nuevo.guardar();
      res.status(201).json({ mensaje: 'Rol creado', rol: saved });
    } catch (err) {
      console.error('Error creando rol:', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async listarRoles(req, res) {
    try {
      const roles = await Rol.obtenerTodos();
      res.status(200).json({ roles });
    } catch (err) {
      console.error('Error listando roles:', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async actualizarRol(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, permisos } = req.body;

      if (!nombre) return res.status(400).json({ mensaje: 'El nombre del rol es requerido' });

      const actual = await RolModel.findById(id);
      if (!actual) return res.status(404).json({ mensaje: 'Rol no encontrado' });

      const nombreNormalizado = String(nombre).trim();
      if (nombreNormalizado.toLowerCase() !== String(actual.nombre).toLowerCase()) {
        const existeOtro = await RolModel.findOne({ nombre: nombreNormalizado });
        if (existeOtro) return res.status(409).json({ mensaje: 'Ya existe un rol con ese nombre' });
      }

      const actualizado = await Rol.actualizar(id, {
        nombre: nombreNormalizado,
        descripcion: descripcion || '',
        color: color || actual.color || '#7c3aed',
        permisos: Array.isArray(permisos) ? permisos : actual.permisos || []
      });

      res.status(200).json({ mensaje: 'Rol actualizado', rol: actualizado });
    } catch (err) {
      console.error('Error actualizando rol:', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async desactivarRol(req, res) {
    try {
      const { id } = req.params;
      const rol = await Rol.desactivar(id);
      if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado' });
      res.status(200).json({ mensaje: 'Rol desactivado', rol });
    } catch (err) {
      console.error('Error desactivando rol:', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async activarRol(req, res) {
    try {
      const { id } = req.params;
      const rol = await Rol.activar(id);
      if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado' });
      res.status(200).json({ mensaje: 'Rol activado', rol });
    } catch (err) {
      console.error('Error activando rol:', err);
      res.status(500).json({ error: err.message });
    }
  }
}

export default RolController;
