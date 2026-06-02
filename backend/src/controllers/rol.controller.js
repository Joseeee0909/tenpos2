import Rol from '../classes/rol.js';

class RolController {
  static async crearRol(req, res) {
    try {
      const { nombre, descripcion, color, permisos } = req.body;

      if (!nombre) {
        return res.status(400).json({
          mensaje: 'El nombre del rol es requerido'
        });
      }

      const empresaId = req.user.empresaId;

      const existente = await Rol.obtenerPorNombre(
        nombre.trim(),
        empresaId
      );

      if (existente) {
        return res.status(409).json({
          mensaje: 'El rol ya existe'
        });
      }

      const nuevo = new Rol(
        empresaId,
        nombre.trim(),
        descripcion || '',
        color || '#7c3aed',
        Array.isArray(permisos) ? permisos : []
      );

      const saved = await nuevo.guardar();

      res.status(201).json({
        mensaje: 'Rol creado',
        rol: saved
      });

    } catch (err) {
      console.error('Error creando rol:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }

  static async listarRoles(req, res) {
    try {
      const empresaId = req.user.empresaId;

      const roles = await Rol.obtenerTodos(empresaId);

      res.status(200).json({ roles });

    } catch (err) {
      console.error('Error listando roles:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }

  static async actualizarRol(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, permisos } = req.body;

      if (!nombre) {
        return res.status(400).json({
          mensaje: 'El nombre del rol es requerido'
        });
      }

      const empresaId = req.user.empresaId;

      const actual = await Rol.obtenerPorId(id, empresaId);

      if (!actual) {
        return res.status(404).json({
          mensaje: 'Rol no encontrado'
        });
      }

      if (actual.empresaId !== empresaId) {
        return res.status(403).json({
          mensaje: 'No autorizado'
        });
      }

      const nombreNormalizado = nombre.trim();

      if (
        nombreNormalizado.toLowerCase() !==
        actual.nombre.toLowerCase()
      ) {
        const existeOtro = await Rol.obtenerPorNombre(
          nombreNormalizado,
          empresaId
        );

        if (existeOtro && existeOtro.id !== id) {
          return res.status(409).json({
            mensaje: 'Ya existe un rol con ese nombre'
          });
        }
      }

      const actualizado = await Rol.actualizar(id, empresaId, {
        nombre: nombreNormalizado,
        descripcion: descripcion || '',
        color: color || actual.color || '#7c3aed',
        permisos: Array.isArray(permisos)
          ? permisos
          : actual.permisos || []
      });

      res.status(200).json({
        mensaje: 'Rol actualizado',
        rol: actualizado
      });

    } catch (err) {
      console.error('Error actualizando rol:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }

  static async desactivarRol(req, res) {
    try {
      const { id } = req.params;

      const rol = await Rol.obtenerPorId(id, req.user.empresaId);

      if (!rol) {
        return res.status(404).json({
          mensaje: 'Rol no encontrado'
        });
      }

      if (rol.empresaId !== req.user.empresaId) {
        return res.status(403).json({
          mensaje: 'No autorizado'
        });
      }

      const actualizado = await Rol.desactivar(id, req.user.empresaId);

      res.status(200).json({
        mensaje: 'Rol desactivado',
        rol: actualizado
      });

    } catch (err) {
      console.error('Error desactivando rol:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }

  static async activarRol(req, res) {
    try {
      const { id } = req.params;

      const rol = await Rol.obtenerPorId(id, req.user.empresaId);

      if (!rol) {
        return res.status(404).json({
          mensaje: 'Rol no encontrado'
        });
      }

      if (rol.empresaId !== req.user.empresaId) {
        return res.status(403).json({
          mensaje: 'No autorizado'
        });
      }

      const actualizado = await Rol.activar(id, req.user.empresaId);

      res.status(200).json({
        mensaje: 'Rol activado',
        rol: actualizado
      });

    } catch (err) {
      console.error('Error activando rol:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }
}

export default RolController;
