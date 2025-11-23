import mongoose from "mongoose";
const userSchema = new mongoose.Schema ({
    idusuario: {type: String, required: true, unique: true, trim : true},
    nombre: {type: String, required: true, trim : true},
    username: {type: String, required: true, unique: true, trim : true},
    email: {type: String, required: true, unique: true, trim : true},
    password: {type: String, required: true},
    rol: {
    type: String
  },
  activo: {
  type: Boolean,
  default: true
}

})

export default mongoose.model('User', userSchema);