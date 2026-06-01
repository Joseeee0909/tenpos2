import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

class Usuario {
  constructor(empresaId, idusuario, nombre, username, email, password, rol = "mesero", activo = true) {
    this.empresaId = empresaId;
    this.idusuario = idusuario;
    this.nombre = nombre;
    this.username = username;
    this.email = email;
    this.password = password;
    this.rol = rol;
    this.activo = activo;
  }

  async registrar() {
    const rolExistente = await prisma.rol.findFirst({
      where: {
        empresaId: this.empresaId,
        nombre: this.rol
      }
    });

    if (!rolExistente) {
      throw new Error(`Rol "${this.rol}" no existe. Crea el rol antes de asignarlo.`);
    }

    const hashedPassword = await bcrypt.hash(this.password, 10);

    return prisma.usuario.create({
      data: {
        empresaId: this.empresaId,
        idusuario: this.idusuario,
        nombre: this.nombre,
        username: this.username,
        email: this.email,
        password: hashedPassword,
        rolId: rolExistente.id,
        activo: this.activo
      },
      include: { rol: true }
    });
  }

  static async obtenerPorUsuario(username, empresaId) {
    return prisma.usuario.findFirst({
      where: {
        username,
        empresaId
      },
      include: { rol: true }
    });
  }

  static async obtenerTodos(empresaId) {
    return prisma.usuario.findMany({
      where: { empresaId },
      include: { rol: true },
      orderBy: { nombre: "asc" }
    });
  }

  static async validarPassword(passwordPlano, passwordHash) {
    return bcrypt.compare(passwordPlano, passwordHash);
  }

  static async eliminar(id, empresaId) {
    return prisma.usuario.delete({ where: { id, empresaId } });
  }

  static async desactivar(id, empresaId) {
    return prisma.usuario.update({
      where: { id, empresaId },
      data: { activo: false }
    });
  }

  static async activar(id, empresaId) {
    return prisma.usuario.update({
      where: { id, empresaId },
      data: { activo: true }
    });
  }

  static async actualizar(id, empresaId, datosActualizados) {
    const data = { ...datosActualizados };

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    if (data.rol) {
      const rol = await prisma.rol.findFirst({
        where: {
          empresaId,
          nombre: data.rol
        }
      });

      if (!rol) {
        throw new Error(`Rol "${data.rol}" no existe.`);
      }

      data.rolId = rol.id;
      delete data.rol;
    }

    return prisma.usuario.update({
      where: { id, empresaId },
      data,
      include: { rol: true }
    });
  }

  toJSON() {
    return {
      username: this.username,
      email: this.email,
      rol: this.rol
    };
  }
}

export default Usuario;
