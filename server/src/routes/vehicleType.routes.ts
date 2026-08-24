import { Router } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { authenticate, authorize } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [types]: any = await pool.execute('SELECT * FROM vehicle_types WHERE isActive = true ORDER BY sortOrder ASC');
    sendSuccess(res, types);
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, description, seatingCapacity, luggageCapacity, sortOrder } = req.body;
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO vehicle_types (id, name, description, seatingCapacity, luggageCapacity, sortOrder, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())',
      [id, name, description || null, parseInt(seatingCapacity), parseInt(luggageCapacity || '2'), parseInt(sortOrder || '0')]
    );
    const [[type]]: any = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [id]);
    sendCreated(res, type, 'Vehicle type created');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, seatingCapacity, luggageCapacity, isActive, sortOrder } = req.body;
    await pool.execute(
      'UPDATE vehicle_types SET name = ?, description = ?, seatingCapacity = ?, luggageCapacity = ?, isActive = ?, sortOrder = ?, updatedAt = NOW() WHERE id = ?',
      [name, description || null, parseInt(seatingCapacity), parseInt(luggageCapacity || '2'), Boolean(isActive), parseInt(sortOrder || '0'), id]
    );
    const [[type]]: any = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [id]);
    sendSuccess(res, type, 'Vehicle type updated');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
});

export default router;
