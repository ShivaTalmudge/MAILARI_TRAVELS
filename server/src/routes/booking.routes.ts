import { Router } from 'express';
import * as ctrl from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBookingSchema } from '../validators/booking.validator';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getBookings);
router.post('/', authorize('CUSTOMER', 'ADMIN'), validate(createBookingSchema), ctrl.createBooking);
router.get('/:id', ctrl.getBookingById);
router.patch('/:id/status', ctrl.updateBookingStatus);
router.post('/:id/assign-driver', authorize('ADMIN'), ctrl.assignDriver);
router.post('/:id/assign-vehicle', authorize('ADMIN'), ctrl.assignVehicle);
router.post('/:id/confirm-payment', authorize('DRIVER'), ctrl.confirmPayment);
router.post('/:id/cancel', ctrl.cancelBooking);

export default router;
