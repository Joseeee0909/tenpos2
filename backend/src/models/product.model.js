import mongoose from "mongoose";
const productSchema = new mongoose.Schema ({
    idproducto: {type: String, required: true, unique: true, trim : true},
    nombre: {type: String, required: true, trim : true},
    precio : {type: Number, required: true},
    descripcion: {type: String, trim : true},
    categoria: {type: String, trim : true, enum : ["bebida", "comida", "postre", "otro"]},
    stock: {type: Number, default: 0, min: 0},
    disponible: { type: Boolean, default: true }
});

export default mongoose.model('Product', productSchema);