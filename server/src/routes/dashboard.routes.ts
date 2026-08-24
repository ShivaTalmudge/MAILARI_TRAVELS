import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/admin', authorize('ADMIN'), ctrl.getAdminDashboard);
router.get('/customer', authorize('CUSTOMER'), ctrl.getCustomerDashboard);
router.get('/driver', authorize('DRIVER'), ctrl.getDriverDashboard);

export default router;
