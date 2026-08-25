import { Router } from 'express';
import * as ctrl from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', authorize('CUSTOMER'), ctrl.createReview);
router.get('/', authorize('ADMIN'), ctrl.getReviews);

export default router;
