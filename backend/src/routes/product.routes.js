import { Router } from "express";
const router = Router();
import ProductController from "../controllers/product.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

router.get("/", (req, res) => ProductController.listarProductos(req, res));
router.get("/:id", (req, res) => ProductController.obtenerProductoPorId(req, res));

// Allow administrador/admin/root to create/update/delete
router.post("/", verifyToken, requireRole('administrador','admin','root'), (req, res) => ProductController.crearProducto(req, res));
router.delete("/:id", verifyToken, requireRole('administrador','admin','root'), (req, res) => {
    const controller = new ProductController();
    return controller.eliminarProducto(req, res);
});
router.put("/:id", verifyToken, requireRole('administrador','admin','root'), (req, res) => {
    const controller = new ProductController();
    return controller.actualizarProducto(req, res);
}
);

export default router;
