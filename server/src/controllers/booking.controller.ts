import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { getPaginationParams, generateBookingNumber, createAuditLog } from '../utils/helpers';
import { createNotification } from '../services/notification.service';
import { BookingStatus, Role, NotificationType, DriverStatus, VehicleStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status, tripType, fromDate, toDate, driverId } = req.query as Record<string, string | undefined>;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (!profile) { sendError(res, 'Profile not found', 404); return; }
      whereClause += ' AND b.customerId = ?';
      params.push(profile.id);
    } else if (req.user?.role === Role.DRIVER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user.userId]);
      if (!profile) { sendError(res, 'Profile not found', 404); return; }
      whereClause += ' AND b.driverId = ?';
      params.push(profile.id);
    }

    if (status) { whereClause += ' AND b.status = ?'; params.push(status); }
    if (tripType) { whereClause += ' AND b.tripType = ?'; params.push(tripType); }
    if (driverId) { whereClause += ' AND b.driverId = ?'; params.push(driverId); }
    if (fromDate) { whereClause += ' AND b.pickupDate >= ?'; params.push(new Date(fromDate)); }
    if (toDate) { whereClause += ' AND b.pickupDate <= ?'; params.push(new Date(toDate)); }

    if (search) {
      whereClause += ' AND (b.bookingNumber LIKE ? OR c.fullName LIKE ? OR u.mobile LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM bookings b
       LEFT JOIN customer_profiles c ON b.customerId = c.id
       LEFT JOIN users u ON c.userId = u.id
       ${whereClause}`,
      params
    );

    params.push(take, skip);
    const [bookingsRaw]: any = await pool.execute(
      `SELECT b.*,
              c.fullName as customerName, u.mobile as customerMobile, u.email as customerEmail,
              d.fullName as driverName, du.mobile as driverMobile, du.email as driverEmail, du.id as driverUserId,
              v.registrationNumber, v.make, v.model, v.color, vt.name as vehicleTypeName
       FROM bookings b
       LEFT JOIN customer_profiles c ON b.customerId = c.id
       LEFT JOIN users u ON c.userId = u.id
       LEFT JOIN driver_profiles d ON b.driverId = d.id
       LEFT JOIN users du ON d.userId = du.id
       LEFT JOIN vehicles v ON b.vehicleId = v.id
       LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id
       ${whereClause}
       ORDER BY b.createdAt DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const bookings = bookingsRaw.map((row: any) => {
      const b: any = { ...row };
      delete b.customerName; delete b.customerMobile; delete b.customerEmail;
      delete b.driverName; delete b.driverMobile; delete b.driverEmail; delete b.driverUserId;
      delete b.registrationNumber; delete b.make; delete b.model; delete b.color; delete b.vehicleTypeName;

      b.customer = row.customerName ? { fullName: row.customerName, user: { mobile: row.customerMobile, email: row.customerEmail } } : null;
      b.driver = row.driverName ? { fullName: row.driverName, user: { id: row.driverUserId, mobile: row.driverMobile, email: row.driverEmail } } : null;
      b.vehicle = row.registrationNumber ? { registrationNumber: row.registrationNumber, make: row.make, model: row.model, color: row.color } : null;
      b.vehicleType = row.vehicleTypeName ? { name: row.vehicleTypeName } : null;
      return b;
    });

    sendSuccess(res, bookings, 'Bookings fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  let customerId: string;

  try {
    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (!profile) { sendError(res, 'Customer profile not found', 404); return; }
      customerId = profile.id;
    } else {
      if (!data.customerId) { sendError(res, 'customerId is required when creating a booking as admin.', 400); return; }
      customerId = data.customerId;
    }

    const { calculateFare } = await import('../services/pricing.service');
    const pickupHour = data.pickupTime ? parseInt((data.pickupTime as string).split(':')[0], 10) : 12;
    const isNightTrip = pickupHour >= 22 || pickupHour < 6;

    const fareResult = await calculateFare({
      vehicleTypeId: data.vehicleTypeId, tripType: data.tripType,
      estimatedDistance: data.estimatedDistance ? parseFloat(data.estimatedDistance) : undefined,
      estimatedDuration: data.estimatedDuration ? parseFloat(data.estimatedDuration) : undefined,
      isNightTrip, hasAirport: Boolean(data.hasAirport), hasStateCrossing: Boolean(data.hasStateCrossing),
      tollCharges: data.tollCharges ? parseFloat(data.tollCharges) : 0, parkingCharges: data.parkingCharges ? parseFloat(data.parkingCharges) : 0,
      extraCharges: data.extraCharges ? parseFloat(data.extraCharges) : 0,
      discount: req.user?.role === Role.ADMIN && data.discount ? parseFloat(data.discount) : 0,
    });

    const bookingNumber = await generateBookingNumber();
    const id = uuidv4();
    const historyId = uuidv4();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO bookings (id, bookingNumber, customerId, vehicleTypeId, tripType, status, pickupLocation, dropLocation, pickupDate, pickupTime, returnDate, passengerCount, luggageCount, estimatedDistance, estimatedDuration, flightNumber, flightType, baseFare, distanceCharges, driverAllowance, tollCharges, parkingCharges, airportCharges, nightCharges, statePermitCharges, extraCharges, discount, subtotal, taxAmount, totalAmount, specialInstructions, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id, bookingNumber, customerId, data.vehicleTypeId, data.tripType, BookingStatus.PENDING, data.pickupLocation, data.dropLocation, new Date(data.pickupDate), data.pickupTime,
          data.returnDate ? new Date(data.returnDate) : null, parseInt(data.passengerCount || '1'), parseInt(data.luggageCount || '0'), data.estimatedDistance ? parseFloat(data.estimatedDistance) : null, data.estimatedDuration ? parseInt(data.estimatedDuration) : null,
          data.flightNumber || null, data.flightType || null, fareResult.baseFare, fareResult.distanceCharges, fareResult.driverAllowance, fareResult.tollCharges, fareResult.parkingCharges, fareResult.airportCharges, fareResult.nightCharges, fareResult.statePermitCharges, fareResult.extraCharges, fareResult.discount, fareResult.subtotal, fareResult.taxAmount, fareResult.totalAmount, data.specialInstructions || null
        ]
      );
      await connection.execute(
        `INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [historyId, id, BookingStatus.PENDING, 'Booking created', req.user?.userId || null, req.user?.role || null]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const [[customerUserId]]: any = await pool.execute('SELECT userId FROM customer_profiles WHERE id = ?', [customerId]);
    if (customerUserId) {
      await createNotification(customerUserId.userId, NotificationType.BOOKING_CREATED, 'Booking Received', `Your booking ${bookingNumber} has been received.`, 'Booking', id);
    }
    const [admins]: any = await pool.execute('SELECT id FROM users WHERE role = "ADMIN"');
    for (const admin of admins) {
      await createNotification(admin.id, NotificationType.BOOKING_CREATED, 'New Booking', `New booking ${bookingNumber} received.`, 'Booking', id);
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Booking', entityId: id, description: `Booking created: ${bookingNumber}`, ipAddress: req.ip });
    
    // Fetch and return the newly created booking to match original logic
    const [[booking]]: any = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    sendCreated(res, booking, `Booking ${bookingNumber} created successfully`);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [[booking]]: any = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }

    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (booking.customerId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
    }
    if (req.user?.role === Role.DRIVER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user.userId]);
      if (booking.driverId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
    }

    const [statusHistory]: any = await pool.execute('SELECT * FROM booking_status_history WHERE bookingId = ? ORDER BY createdAt DESC', [id]);
    const [payments]: any = await pool.execute('SELECT * FROM payments WHERE bookingId = ?', [id]);
    
    sendSuccess(res, { ...booking, statusHistory, payments });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, note } = req.body;

  try {
    const [[booking]]: any = await pool.execute(
      `SELECT b.*, c.userId as customerUserId FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id WHERE b.id = ?`, [id]
    );
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }

    const VALID_TRANSITIONS: Record<string, string[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED],
      [BookingStatus.CONFIRMED]: [BookingStatus.DRIVER_ASSIGNED, BookingStatus.CANCELLED],
      [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_ACCEPTED, BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.DRIVER_ACCEPTED]: [BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.CANCELLED],
      [BookingStatus.DRIVER_ON_THE_WAY]: [BookingStatus.ARRIVED],
      [BookingStatus.ARRIVED]: [BookingStatus.TRIP_STARTED],
      [BookingStatus.TRIP_STARTED]: [BookingStatus.TRIP_COMPLETED],
    };

    const allowedNext = VALID_TRANSITIONS[booking.status] || [];
    if (!allowedNext.includes(status)) { sendError(res, `Cannot transition from ${booking.status} to ${status}.`, 400); return; }

    const historyId = uuidv4();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
      await connection.execute(
        'INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [historyId, id, status, note || null, req.user?.userId || null, req.user?.role || null]
      );
      if (status === BookingStatus.TRIP_COMPLETED) {
        if (booking.driverId) await connection.execute('UPDATE driver_profiles SET status = "AVAILABLE" WHERE id = ?', [booking.driverId]);
        if (booking.vehicleId) await connection.execute('UPDATE vehicles SET status = "AVAILABLE" WHERE id = ?', [booking.vehicleId]);
      }
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const notifMap: Record<string, { type: NotificationType; title: string; message: string }> = {
      CONFIRMED: { type: NotificationType.BOOKING_CONFIRMED, title: 'Booking Confirmed', message: `Your booking ${booking.bookingNumber} has been confirmed.` },
      DRIVER_ASSIGNED: { type: NotificationType.DRIVER_ASSIGNED, title: 'Driver Assigned', message: `A driver has been assigned to your booking ${booking.bookingNumber}.` },
      DRIVER_ACCEPTED: { type: NotificationType.DRIVER_ACCEPTED, title: 'Driver Accepted', message: `Your driver has accepted the trip for booking ${booking.bookingNumber}.` },
      DRIVER_ON_THE_WAY: { type: NotificationType.DRIVER_ON_THE_WAY, title: 'Driver On The Way', message: `Your driver is on the way for booking ${booking.bookingNumber}.` },
      TRIP_STARTED: { type: NotificationType.TRIP_STARTED, title: 'Trip Started', message: `Your trip has started for booking ${booking.bookingNumber}.` },
      TRIP_COMPLETED: { type: NotificationType.TRIP_COMPLETED, title: 'Trip Completed', message: `Your trip has been completed.` },
      CANCELLED: { type: NotificationType.BOOKING_CANCELLED, title: 'Booking Cancelled', message: `Your booking ${booking.bookingNumber} has been cancelled.` },
    };

    if (notifMap[status] && booking.customerUserId) {
      await createNotification(booking.customerUserId, notifMap[status].type, notifMap[status].title, notifMap[status].message, 'Booking', id);
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Booking', entityId: id, description: `Booking ${booking.bookingNumber} status changed to ${status}`, ipAddress: req.ip });
    sendSuccess(res, null, `Booking status updated to ${status}`);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const assignDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { driverId } = req.body;

  try {
    const [[booking]]: any = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }
    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      sendError(res, 'Driver can only be assigned to confirmed or pending bookings.', 400); return;
    }

    const [[driver]]: any = await pool.execute('SELECT * FROM driver_profiles WHERE id = ?', [driverId]);
    if (!driver) { sendNotFound(res, 'Driver not found'); return; }
    if (driver.status !== DriverStatus.AVAILABLE) { sendError(res, 'Selected driver is not available.', 400); return; }

    const historyId = uuidv4();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE bookings SET driverId = ?, status = ? WHERE id = ?', [driverId, BookingStatus.DRIVER_ASSIGNED, id]);
      await connection.execute('UPDATE driver_profiles SET status = "ON_TRIP" WHERE id = ?', [driverId]);
      await connection.execute(
        'INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [historyId, id, BookingStatus.DRIVER_ASSIGNED, `Driver ${driver.fullName} assigned`, req.user?.userId || null, req.user?.role || null]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createNotification(driver.userId, NotificationType.DRIVER_ASSIGNED, 'New Trip Assigned', `You have been assigned a new trip. Booking: ${booking.bookingNumber}`, 'Booking', id);

    const [[customer]]: any = await pool.execute('SELECT userId FROM customer_profiles WHERE id = ?', [booking.customerId]);
    if (customer) {
      await createNotification(customer.userId, NotificationType.DRIVER_ASSIGNED, 'Driver Assigned', `Driver ${driver.fullName} has been assigned to your booking ${booking.bookingNumber}.`, 'Booking', id);
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_DRIVER', entity: 'Booking', entityId: id, description: `Driver ${driver.fullName} assigned`, ipAddress: req.ip });
    sendSuccess(res, null, 'Driver assigned successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const assignVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { vehicleId } = req.body;

  try {
    const [[booking]]: any = await pool.execute('SELECT id, bookingNumber FROM bookings WHERE id = ?', [id]);
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }

    const [[vehicle]]: any = await pool.execute('SELECT status, registrationNumber FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }
    if (vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.INACTIVE) { sendError(res, 'Selected vehicle is not available.', 400); return; }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE bookings SET vehicleId = ? WHERE id = ?', [vehicleId, id]);
      await connection.execute('UPDATE vehicles SET status = "ON_TRIP" WHERE id = ?', [vehicleId]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_VEHICLE', entity: 'Booking', entityId: id, description: `Vehicle ${vehicle.registrationNumber} assigned to booking ${booking.bookingNumber}` });
    sendSuccess(res, null, 'Vehicle assigned successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const [[booking]]: any = await pool.execute('SELECT b.*, c.userId as customerUserId FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id WHERE b.id = ?', [id]);
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }

    if (booking.status === BookingStatus.TRIP_STARTED || booking.status === BookingStatus.TRIP_COMPLETED) { sendError(res, 'Cannot cancel a trip that has started or completed.', 400); return; }

    if (req.user?.role === Role.CUSTOMER && booking.customerUserId !== req.user.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const historyId = uuidv4();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', [BookingStatus.CANCELLED, id]);
      await connection.execute(
        'INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [historyId, id, BookingStatus.CANCELLED, reason || 'Cancelled', req.user?.userId || null, req.user?.role || null]
      );
      if (booking.driverId) await connection.execute('UPDATE driver_profiles SET status = "AVAILABLE" WHERE id = ?', [booking.driverId]);
      if (booking.vehicleId) await connection.execute('UPDATE vehicles SET status = "AVAILABLE" WHERE id = ?', [booking.vehicleId]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    if (booking.customerUserId) await createNotification(booking.customerUserId, NotificationType.BOOKING_CANCELLED, 'Booking Cancelled', `Your booking ${booking.bookingNumber} has been cancelled.`, 'Booking', id);
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CANCEL', entity: 'Booking', entityId: id, description: `Booking cancelled: ${reason || 'N/A'}`, ipAddress: req.ip });
    
    sendSuccess(res, null, 'Booking cancelled successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
