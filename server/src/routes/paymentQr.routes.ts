import { Router } from 'express';
import * as ctrl from '../controllers/paymentQr.controller';
import { authenticate, authorize } from '../middleware/auth';
import { imageUpload } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.get('/active', ctrl.getActiveConfig);
router.get('/', authorize('ADMIN'), ctrl.listConfigs);
router.post('/', authorize('ADMIN'), imageUpload.single('qrImage'), ctrl.createConfig);
router.patch('/:id/activate', authorize('ADMIN'), ctrl.setActive);
router.patch('/:id/deactivate', authorize('ADMIN'), ctrl.setActive);

export default router;
