import { Router } from 'express'
import { getDashboardSummary } from '../controllers/dashboard.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/dashboard/summary', verifyToken, getDashboardSummary)

export default router
