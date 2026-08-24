import { Router } from 'express';
import * as ctrl from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/bookings', ctrl.getBookingReport);
router.get('/revenue', ctrl.getRevenueReport);
router.get('/gst', ctrl.getGstReport);
router.get('/drivers', ctrl.getDriverReport);
router.get('/vehicles', ctrl.getVehicleReport);
router.get('/customers', ctrl.getCustomerReport);

export default router;
