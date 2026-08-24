import { Router } from 'express';
import * as ctrl from '../controllers/trip.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getTrips);
router.patch('/:id/status', ctrl.updateTripStatus);

export default router;
