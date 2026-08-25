import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response';
import { Role } from '../types';

export const createReview = async (req: Request, res: Response): Promise<void> => {
  const { bookingId, rating, feedback } = req.body;
  const userId = req.user!.userId;

  try {
    const [[customer]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [userId]);
    if (!customer) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const [[booking]]: any = await pool.execute(
      'SELECT id, driverId, status FROM bookings WHERE id = ? AND customerId = ?',
      [bookingId, customer.id]
    );

    if (!booking) { sendNotFound(res, 'Booking not found'); return; }
    if (booking.status !== 'TRIP_COMPLETED') {
      res.status(400).json({ success: false, message: 'You can only review completed trips.' }); return;
    }

    const [[existing]]: any = await pool.execute('SELECT id FROM reviews WHERE bookingId = ?', [bookingId]);
    if (existing) { res.status(400).json({ success: false, message: 'You have already reviewed this trip.' }); return; }

    const reviewId = uuidv4();
    await pool.execute(
      'INSERT INTO reviews (id, bookingId, customerId, driverId, rating, feedback) VALUES (?, ?, ?, ?, ?, ?)',
      [reviewId, bookingId, customer.id, booking.driverId, rating, feedback || null]
    );

    const [[review]]: any = await pool.execute('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    sendCreated(res, review, 'Review submitted successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (profile) { whereClause += ' AND r.customerId = ?'; params.push(profile.id); }
      else { sendSuccess(res, []); return; }
    } else if (req.user?.role === Role.DRIVER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user.userId]);
      if (profile) { whereClause += ' AND r.driverId = ?'; params.push(profile.id); }
      else { sendSuccess(res, []); return; }
    }

    const [reviews]: any = await pool.execute(`
      SELECT r.*, b.bookingNumber, c.fullName as customerName, d.fullName as driverName
      FROM reviews r
      JOIN bookings b ON r.bookingId = b.id
      JOIN customer_profiles c ON r.customerId = c.id
      LEFT JOIN driver_profiles d ON r.driverId = d.id
      ${whereClause}
      ORDER BY r.createdAt DESC
    `, params);
    sendSuccess(res, reviews);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
