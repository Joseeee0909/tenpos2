import TablaModel from '../models/tabla.model.js';

class TablaController {
  // Obtener todas las mesas
  static async obtenerTablas(req, res) {
    try {
      const tablas = await TablaModel.find().populate('pedido');
      res.json(tablas);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Obtener una mesa
  static async obtenerTabla(req, res) {
    try {
      const tabla = await TablaModel.findById(req.params.id).populate('pedido');
      if (!tabla) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
      res.json(tabla);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Crear nueva mesa
  static async crearTabla(req, res) {
    try {
      const { numero, capacidad } = req.body;
      
      if (!numero) return res.status(400).json({ mensaje: 'El número de mesa es requerido' });

      // Verificar si la mesa ya existe
      const existente = await TablaModel.findOne({ numero });
      if (existente) return res.status(409).json({ mensaje: 'La mesa ya existe' });

      const tabla = new TablaModel({
        numero,
        capacidad: capacidad || 4,
        estado: 'disponible'
      });

      const saved = await tabla.save();
      res.status(201).json({ mensaje: 'Mesa creada', tabla: saved });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Actualizar estado de mesa
  static async actualizarTabla(req, res) {
    try {
      const { estado, pedido } = req.body;
      const tabla = await TablaModel.findByIdAndUpdate(
        req.params.id,
        { estado, pedido },
        { new: true }
      ).populate('pedido');

      if (!tabla) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
      res.json(tabla);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Eliminar mesa
  static async eliminarTabla(req, res) {
    try {
      const tabla = await TablaModel.findByIdAndDelete(req.params.id);
      if (!tabla) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
      res.json({ mensaje: 'Mesa eliminada' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Obtener o crear mesas por defecto (10 mesas)
  static async inicializarMesas(req, res) {
    try {
      const tablas = await TablaModel.find();
      
      if (tablas.length === 0) {
        // Crear 10 mesas por defecto
        const nuevasTablas = [];
        for (let i = 1; i <= 10; i++) {
          nuevasTablas.push({
            numero: i,
            capacidad: 4,
            estado: 'disponible'
          });
        }
        const created = await TablaModel.insertMany(nuevasTablas);
        return res.status(201).json({ 
          mensaje: 'Mesas inicializadas', 
          tablas: created 
        });
      }
      
      res.json({ 
        mensaje: 'Mesas ya existen', 
        tablas 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default TablaController;
