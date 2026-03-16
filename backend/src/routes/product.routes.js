import { Router } from "express";
const router = Router();
import ProductController from "../controllers/product.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

// Listar productos (public)
router.get('/', ProductController.listarProductos);

// Crear producto (solo admin)
router.post(
    '/',
    verifyToken,
    requireRole('administrador', 'admin', 'root'),
    ProductController.crearProducto
);  

// Obtener producto por ID (public)
router.get('/:id', ProductController.obtenerProductoPorId);

// Actualizar producto por ID (solo admin)
router.put(
    '/:id',
    verifyToken,
    requireRole('administrador', 'admin', 'root'),
    ProductController.actualizarProducto
);

// Eliminar producto por ID (solo admin)
router.delete(
    '/:id',
    verifyToken,
    requireRole('administrador', 'admin', 'root'),
    ProductController.eliminarProducto
);

// Cambiar disponibilidad de producto
router.patch('/:id/disponible', verifyToken, requireRole('admin', 'root', 'administrador'), ProductController.cambiarDisponibilidad);


export default router;

