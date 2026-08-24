import { Router } from 'express';
import * as ctrl from '../controllers/driver.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createDriverSchema } from '../validators/auth.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN'), ctrl.getDrivers);
router.get('/available', authorize('ADMIN'), ctrl.getAvailableDrivers);
router.post('/', authorize('ADMIN'), validate(createDriverSchema), ctrl.createDriver);
router.get('/:id', authorize('ADMIN', 'DRIVER'), ctrl.getDriverById);
router.put('/:id', authorize('ADMIN', 'DRIVER'), ctrl.updateDriver);
router.patch('/:id/status', authorize('ADMIN'), ctrl.updateDriverStatus);
router.patch('/:id/assign-vehicle', authorize('ADMIN'), ctrl.assignVehicleToDriver);

export default router;
