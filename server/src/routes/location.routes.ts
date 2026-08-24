import { Router } from 'express';
import * as ctrl from '../controllers/location.controller';

// Deliberately public (unlike most /api routes): the marketing landing
// page's booking widget needs location search before a visitor has an
// account. It's read-only, has no side effects, and is covered by the same
// global rate limiter as every other /api route — and, unlike the previous
// client-side Nominatim calls, is now server-cached and centrally rate
// limited instead of uncontrolled.
const router = Router();

router.get('/search', ctrl.search);
router.get('/reverse', ctrl.reverse);
router.post('/route', ctrl.route);

export default router;
