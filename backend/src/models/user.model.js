import mongoose from "mongoose";
const userSchema = new mongoose.Schema ({
    nombre: {type: String, required: true, trim : true},
    username: {type: String, required: true, unique: true, trim : true},
    email: {type: String, required: true, unique: true, trim : true},
    password: {type: String, required: true},
    rol: {
    type: String,
    enum: ["root", "admin", "mesero", "cocinero"], 
    default: "mesero"
  },
})

export default mongoose.model('User', userSchema);