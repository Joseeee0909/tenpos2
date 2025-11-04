import { Router } from 'express';
const router = Router();
import UserController from '../controllers/user.controller.js';

router.get('/login/usuario', UserController.listarUsuarios);

export default router;