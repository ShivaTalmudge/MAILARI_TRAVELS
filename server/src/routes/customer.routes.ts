import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN'), ctrl.getCustomers);
router.get('/me', ctrl.getMyProfile);
router.get('/:id', authorize('ADMIN', 'CUSTOMER'), ctrl.getCustomerById);
router.put('/:id', authorize('ADMIN', 'CUSTOMER'), ctrl.updateCustomer);
router.patch('/:id/status', authorize('ADMIN'), ctrl.updateCustomerStatus);

export default router;
