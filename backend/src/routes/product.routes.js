import { Router } from "express";
const router = Router();
import ProductController from "../controllers/product.controller.js";
import { verifyToken, requirePermission } from "../middlewares/auth.middleware.js";

// Listar productos
router.get(
    '/',
    verifyToken,
    requirePermission('ver_productos', 'gestionar_productos'),
    ProductController.listarProductos
);

// Crear producto
router.post(
    '/',
    verifyToken,
    requirePermission('gestionar_productos'),
    ProductController.crearProducto
);  

// Obtener producto por ID
router.get(
    '/:id',
    verifyToken,
    requirePermission('ver_productos', 'gestionar_productos'),
    ProductController.obtenerProductoPorId
);

// Actualizar producto por ID
router.put(
    '/:id',
    verifyToken,
    requirePermission('gestionar_productos'),
    ProductController.actualizarProducto
);

// Eliminar producto por ID
router.delete(
    '/:id',
    verifyToken,
    requirePermission('gestionar_productos'),
    ProductController.eliminarProducto
);

// Cambiar disponibilidad de producto
router.patch(
    '/:id/disponible',
    verifyToken,
    requirePermission('gestionar_productos'),
    ProductController.cambiarDisponibilidad
);


export default router;

