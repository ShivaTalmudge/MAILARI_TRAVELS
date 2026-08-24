import { Router } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated } from '../utils/response';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  const types = await prisma.vehicleType.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  sendSuccess(res, types);
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, description, seatingCapacity, luggageCapacity, sortOrder } = req.body;
  const type = await prisma.vehicleType.create({
    data: { name, description, seatingCapacity: parseInt(seatingCapacity), luggageCapacity: parseInt(luggageCapacity || '2'), sortOrder: parseInt(sortOrder || '0') },
  });
  sendCreated(res, type, 'Vehicle type created');
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, description, seatingCapacity, luggageCapacity, isActive, sortOrder } = req.body;
  const type = await prisma.vehicleType.update({
    where: { id: req.params.id },
    data: { name, description, seatingCapacity: parseInt(seatingCapacity), luggageCapacity: parseInt(luggageCapacity || '2'), isActive: Boolean(isActive), sortOrder: parseInt(sortOrder || '0') },
  });
  sendSuccess(res, type, 'Vehicle type updated');
});

export default router;
