import { Router } from 'express';
const router = Router();
import AuthController from "../controllers/auth.controller.js";

router.post("/register",AuthController.register)
router.post("/login", AuthController.login)
router.post("/logout", AuthController.logout)


    
export default router;