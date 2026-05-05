import TablaModel from '../models/tabla.model.js';
import Pedido from '../models/pedidos.model.js';

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
      const tablaActual = await TablaModel.findById(req.params.id);
      if (!tablaActual) return res.status(404).json({ mensaje: 'Mesa no encontrada' });

      const payload = {};

      if (typeof req.body.numero !== 'undefined') payload.numero = req.body.numero;
      if (typeof req.body.capacidad !== 'undefined') payload.capacidad = req.body.capacidad;
      if (typeof req.body.pedido !== 'undefined') payload.pedido = req.body.pedido;

      if (typeof req.body.estado !== 'undefined') {
        const estadoSolicitado = String(req.body.estado);

        if (estadoSolicitado !== 'ocupada') {
          const pedidoActivo = await Pedido.findOne({
            mesa: Number(tablaActual.numero),
            estado: { $ne: 'entregado' }
          }).select('_id estado');

          if (pedidoActivo) {
            return res.status(409).json({
              mensaje: 'Esta mesa tiene un pedido activo y debe permanecer ocupada hasta registrar el pago.'
            });
          }
        }

        payload.estado = estadoSolicitado;
      }

      const tabla = await TablaModel.findByIdAndUpdate(
        req.params.id,
        payload,
        { new: true }
      ).populate('pedido');

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
