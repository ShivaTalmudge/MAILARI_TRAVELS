import { Router } from 'express';
import * as ctrl from '../controllers/auditLog.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN'));
router.get('/', ctrl.getAuditLogs);

export default router;
