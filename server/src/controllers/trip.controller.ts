import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { createAuditLog } from '../utils/helpers';
import { BookingStatus, DriverStatus, VehicleStatus } from '../types';

export const getTrips = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  let driverId = null;

  if (req.user?.role === 'DRIVER') {
    const [[driver]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [userId]);
    if (!driver) { sendError(res, 'Driver profile not found', 404); return; }
    driverId = driver.id;
  }

  let query = `
    SELECT t.*, 
           b.bookingNumber, b.customerId, b.vehicleId,
           c.fullName as customerName, u.mobile as customerMobile,
           v.registrationNumber, v.make, v.model
    FROM trips t
    LEFT JOIN bookings b ON t.bookingId = b.id
    LEFT JOIN customer_profiles c ON b.customerId = c.id
    LEFT JOIN users u ON c.userId = u.id
    LEFT JOIN vehicles v ON b.vehicleId = v.id
  `;
  const params: any[] = [];
  
  if (driverId) {
    query += ' WHERE t.driverId = ?';
    params.push(driverId);
  }
  query += ' ORDER BY t.createdAt DESC';

  const [tripsRaw]: any = await pool.execute(query, params);
  
  const trips = tripsRaw.map((t: any) => ({
    id: t.id, bookingId: t.bookingId, driverId: t.driverId, vehicleId: t.vehicleId, status: t.status, startTime: t.startTime, endTime: t.endTime, startOdometer: t.startOdometer, endOdometer: t.endOdometer, actualDistance: t.actualDistance, actualDuration: t.actualDuration, driverNotes: t.driverNotes, issueReported: t.issueReported, createdAt: t.createdAt, updatedAt: t.updatedAt,
    booking: {
      bookingNumber: t.bookingNumber, customerId: t.customerId, vehicleId: t.vehicleId,
      customer: t.customerName ? { fullName: t.customerName, user: { mobile: t.customerMobile } } : null,
      vehicle: t.registrationNumber ? { registrationNumber: t.registrationNumber, make: t.make, model: t.model } : null
    }
  }));

  sendSuccess(res, trips);
};

export const updateTripStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, startOdometer, endOdometer, driverNotes, issueReported } = req.body;

  const [[trip]]: any = await pool.execute('SELECT * FROM trips WHERE id = ?', [id]);
  if (!trip) { sendNotFound(res, 'Trip not found'); return; }

  if (req.user?.role === 'DRIVER') {
    const [[driver]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user.userId]);
    if (trip.driverId !== driver?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (status === 'STARTED') {
      const so = startOdometer ? parseInt(startOdometer) : null;
      await connection.execute('UPDATE trips SET startTime = NOW(), startOdometer = ?, driverNotes = ?, issueReported = COALESCE(?, issueReported) WHERE id = ?', [so, driverNotes || null, issueReported, id]);
      await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', [BookingStatus.TRIP_STARTED, trip.bookingId]);
      await connection.execute('INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(), NOW())', [trip.bookingId, BookingStatus.TRIP_STARTED, 'Trip started by driver', req.user?.userId || null, req.user?.role || null]);
    } else if (status === 'COMPLETED') {
      const eo = endOdometer ? parseInt(endOdometer) : null;
      let dist = null; let dur = null;
      if (trip.startOdometer && eo) dist = eo - trip.startOdometer;
      if (trip.startTime) dur = Math.round((new Date().getTime() - new Date(trip.startTime).getTime()) / 60000);
      
      await connection.execute('UPDATE trips SET endTime = NOW(), endOdometer = ?, actualDistance = COALESCE(?, actualDistance), actualDuration = COALESCE(?, actualDuration), driverNotes = ?, issueReported = COALESCE(?, issueReported) WHERE id = ?', [eo, dist, dur, driverNotes || null, issueReported, id]);
      await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', [BookingStatus.TRIP_COMPLETED, trip.bookingId]);
      await connection.execute('INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, ?, NOW(), NOW())', [trip.bookingId, BookingStatus.TRIP_COMPLETED, 'Trip completed by driver', req.user?.userId || null, req.user?.role || null]);
      if (trip.driverId) await connection.execute('UPDATE driver_profiles SET status = ? WHERE id = ?', [DriverStatus.AVAILABLE, trip.driverId]);
      if (trip.vehicleId) await connection.execute('UPDATE vehicles SET status = ? WHERE id = ?', [VehicleStatus.AVAILABLE, trip.vehicleId]);
    } else {
      await connection.execute('UPDATE trips SET driverNotes = ?, issueReported = COALESCE(?, issueReported) WHERE id = ?', [driverNotes || null, issueReported, id]);
    }

    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }

  await createAuditLog({ userId: req.user?.userId, userRole: req.user?.role, action: 'TRIP_UPDATE', entity: 'Trip', entityId: id, description: `Trip status updated to ${status}` });
  sendSuccess(res, null, 'Trip updated successfully');
};
