import Rol from '../classes/rol.js';
import RolModel from '../models/rol.model.js';

class RolController {
  static async crearRol(req, res) {
    try {
      const { nombre, descripcion } = req.body;
      if (!nombre) return res.status(400).json({ mensaje: 'El nombre del rol es requerido' });

      // evitar duplicados
      const existente = await RolModel.findOne({ nombre });
      if (existente) return res.status(409).json({ mensaje: 'El rol ya existe' });

      const nuevo = new Rol(nombre, descripcion || '');
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
}

export default RolController;
