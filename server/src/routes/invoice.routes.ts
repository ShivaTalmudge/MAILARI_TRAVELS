import { Router } from 'express';
import * as ctrl from '../controllers/invoice.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getInvoices);
router.post('/', authorize('ADMIN'), ctrl.generateInvoice);
router.get('/:id', ctrl.getInvoiceById);

export default router;
