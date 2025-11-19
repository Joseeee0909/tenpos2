import { Router } from "express";
const router = Router();
import ProductController from "../controllers/product.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

// Listar productos (public)
router.get('/', ProductController.listarProductos);

// Obtener producto por ID (public)
router.get('/productos/:id', ProductController.obtenerProductoPorId);

// Crear producto (solo admin)
router.post(
    '/productos',
    verifyToken,
    requireRole('administrador', 'admin', 'root'),
    ProductController.crearProducto
);  

// Actualizar producto por ID (solo admin)
router.put(
    '/productos/:id',
    verifyToken,
    requireRole('administrador', 'admin', 'root'),
    ProductController.actualizarProducto
);

// Eliminar producto por ID (solo admin)
router.delete(
    '/productos/:id',
    verifyToken,
    requireRole('administrador', 'admin', 'root'),
    ProductController.eliminarProducto
);

export default router;

