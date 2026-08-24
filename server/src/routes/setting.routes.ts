import { Router } from 'express';
import * as ctrl from '../controllers/setting.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/public', ctrl.getPublicSettings);
router.get('/', authenticate, authorize('ADMIN'), ctrl.getSettings);
router.put('/', authenticate, authorize('ADMIN'), ctrl.updateSettings);

export default router;
