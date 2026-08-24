import { Router } from 'express';
import * as ctrl from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPaymentSchema, updatePaymentStatusSchema } from '../validators/payment.validator';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getPayments);
router.post('/', authorize('ADMIN'), validate(createPaymentSchema), ctrl.createPayment);
router.get('/:id', ctrl.getPaymentById);
router.patch('/:id/status', authorize('ADMIN'), validate(updatePaymentStatusSchema), ctrl.updatePaymentStatus);

export default router;
