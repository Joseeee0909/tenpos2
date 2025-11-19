import { Router } from "express";
const router = Router();
import ProductController from "../controllers/product.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

// List all products (public)
router.get("/", ProductController.listarProductos);
router.get("/:id", ProductController.obtenerProductoPorId);
// Create a new product (admin only)
router.post("/", verifyToken, requireRole('admin'), ProductController.crearProducto);
// Delete a product by ID (admin only)
router.delete("/:id", verifyToken, requireRole('admin'), (req, res) => {
    const controller = new ProductController();
    return controller.eliminarProducto(req, res);
});
// Update a product by ID (admin only)
router.put("/:id", verifyToken, requireRole('admin'), (req, res) => {
    const controller = new ProductController();
    return controller.actualizarProducto(req, res);
}
);

export default router;
