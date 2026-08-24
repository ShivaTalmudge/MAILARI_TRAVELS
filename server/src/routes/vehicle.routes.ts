import { Router } from 'express';
import * as ctrl from '../controllers/vehicle.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'DRIVER'), ctrl.getVehicles);
router.get('/available', authorize('ADMIN'), ctrl.getAvailableVehicles);
router.get('/expiry-alerts', authorize('ADMIN'), ctrl.getExpiryAlerts);
router.post('/', authorize('ADMIN'), validate(createVehicleSchema), ctrl.createVehicle);
router.get('/:id', authorize('ADMIN', 'DRIVER'), ctrl.getVehicleById);
router.put('/:id', authorize('ADMIN'), validate(updateVehicleSchema), ctrl.updateVehicle);
router.patch('/:id/status', authorize('ADMIN'), ctrl.updateVehicleStatus);
router.post('/:id/documents', authorize('ADMIN'), ctrl.addVehicleDocument);

export default router;
