import { Router } from 'express';
import * as ctrl from '../controllers/support.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getTickets);
router.post('/', ctrl.createTicket);
router.get('/:id', ctrl.getTicketById);
router.post('/:id/messages', ctrl.addMessage);
router.patch('/:id/status', authorize('ADMIN'), ctrl.updateTicketStatus);

export default router;
