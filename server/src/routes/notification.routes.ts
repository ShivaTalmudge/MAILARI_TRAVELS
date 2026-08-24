import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getNotifications);
router.patch('/:id/read', ctrl.markAsRead);
router.post('/read-all', ctrl.markAllAsRead);

export default router;
