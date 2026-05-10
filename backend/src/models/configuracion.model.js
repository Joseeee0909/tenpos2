import mongoose from 'mongoose'

const configuracionSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true, default: 'facturacion' },
  facturacion: {
    nombre: { type: String, default: 'SIIGO S.A.S' },
    nit: { type: String, default: '800200100-0' },
    direccion: { type: String, default: 'Cali, Colombia' },
    telefono: { type: String, default: '' },
    resolucion: { type: String, default: '' },
    autorizada: { type: String, default: '' },
    prefijo: { type: String, default: 'POS - 1' },
    responsable: { type: String, default: 'Responsable de IVA' }
  }
})

export default mongoose.model('Configuracion', configuracionSchema)
