import { Router } from 'express';
import * as ctrl from '../controllers/pricing.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/rules', authenticate, ctrl.getPricingRules);
router.post('/rules', authenticate, authorize('ADMIN'), ctrl.createPricingRule);
router.put('/rules/:id', authenticate, authorize('ADMIN'), ctrl.updatePricingRule);
router.get('/tax', authenticate, ctrl.getTaxConfigs);
router.post('/tax', authenticate, authorize('ADMIN'), ctrl.createTaxConfig);
router.post('/calculate', authenticate, ctrl.calculateFarePreview);

export default router;
