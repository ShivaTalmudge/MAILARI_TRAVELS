import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError, sendForbidden } from '../utils/response';
import { getPaginationParams, generateBookingNumber, generatePaymentNumber, createAuditLog } from '../utils/helpers';
import {
  createNotification, sendBookingConfirmation, sendBookingReceivedEmail,
  sendBookingConfirmedEmail, sendDriverAssignment, sendBookingCancellation,
  sendPaymentConfirmation, sendPaymentReceivedEmail,
} from '../services/notification.service';
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
        `INSERT INTO bookings (id, bookingNumber, customerId, vehicleTypeId, tripType, status, pickupLocation, pickupLat, pickupLng, dropLocation, dropLat, dropLng, pickupDate, pickupTime, returnDate, passengerCount, luggageCount, estimatedDistance, estimatedDuration, flightNumber, flightType, baseFare, distanceCharges, driverAllowance, tollCharges, parkingCharges, airportCharges, nightCharges, statePermitCharges, extraCharges, discount, subtotal, taxAmount, totalAmount, specialInstructions, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id, bookingNumber, customerId, data.vehicleTypeId, data.tripType, BookingStatus.PENDING,
          data.pickupLocation, data.pickupLat ?? null, data.pickupLng ?? null,
          data.dropLocation ?? null, data.dropLat ?? null, data.dropLng ?? null,
          new Date(data.pickupDate), data.pickupTime,
          data.returnDate ? new Date(data.returnDate) : null, parseInt(data.passengerCount || '1'), parseInt(data.luggageCount || '0'), data.estimatedDistance ? parseFloat(data.estimatedDistance) : null, data.estimatedDuration ? parseInt(data.estimatedDuration) : null,
          data.flightNumber ?? null, data.flightType ?? null, fareResult.baseFare, fareResult.distanceCharges, fareResult.driverAllowance, fareResult.tollCharges, fareResult.parkingCharges, fareResult.airportCharges, fareResult.nightCharges, fareResult.statePermitCharges, fareResult.extraCharges, fareResult.discount, fareResult.subtotal, fareResult.taxAmount, fareResult.totalAmount, data.specialInstructions ?? null
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

    const [[customerContact]]: any = await pool.execute(
      `SELECT u.id as userId, u.mobile, u.email, c.fullName FROM customer_profiles c JOIN users u ON c.userId = u.id WHERE c.id = ?`, [customerId]
    );
    if (customerContact) {
      await createNotification(customerContact.userId, NotificationType.BOOKING_CREATED, 'Booking Received', `Your booking ${bookingNumber} has been received.`, 'Booking', id);
      // Booking creation succeeds regardless of whether these external
      // channels are reachable — both functions log delivery status rather
      // than throwing.
      if (customerContact.mobile) await sendBookingConfirmation(customerContact.mobile, bookingNumber, customerContact.fullName || 'Customer', id);
      if (customerContact.email) {
        await sendBookingReceivedEmail(customerContact.email, customerContact.fullName || 'Customer', bookingNumber, {
          pickupDate: data.pickupDate, pickupTime: data.pickupTime, pickupLocation: data.pickupLocation,
        }, id);
      }
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
    const [[row]]: any = await pool.execute(
      `SELECT b.*,
              c.fullName as customerName, u.mobile as customerMobile, u.email as customerEmail,
              d.fullName as driverName, du.mobile as driverMobile, du.email as driverEmail,
              v.registrationNumber, v.make, v.model, v.color, vt.name as vehicleTypeName, vt.seatingCapacity
       FROM bookings b
       LEFT JOIN customer_profiles c ON b.customerId = c.id
       LEFT JOIN users u ON c.userId = u.id
       LEFT JOIN driver_profiles d ON b.driverId = d.id
       LEFT JOIN users du ON d.userId = du.id
       LEFT JOIN vehicles v ON b.vehicleId = v.id
       LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id
       WHERE b.id = ?`,
      [id]
    );
    if (!row) { sendNotFound(res, 'Booking not found'); return; }

    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (row.customerId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
    }
    if (req.user?.role === Role.DRIVER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user.userId]);
      if (row.driverId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
    }

    const [statusHistory]: any = await pool.execute('SELECT * FROM booking_status_history WHERE bookingId = ? ORDER BY createdAt DESC', [id]);
    const [payments]: any = await pool.execute('SELECT * FROM payments WHERE bookingId = ? ORDER BY createdAt DESC', [id]);

    const booking: any = { ...row };
    delete booking.customerName; delete booking.customerMobile; delete booking.customerEmail;
    delete booking.driverName; delete booking.driverMobile; delete booking.driverEmail;
    delete booking.registrationNumber; delete booking.make; delete booking.model; delete booking.color;
    delete booking.vehicleTypeName; delete booking.seatingCapacity;

    booking.customer = row.customerName ? { fullName: row.customerName, user: { mobile: row.customerMobile, email: row.customerEmail } } : null;
    booking.driver = row.driverName ? { fullName: row.driverName, user: { mobile: row.driverMobile, email: row.driverEmail } } : null;
    booking.vehicle = row.registrationNumber ? { registrationNumber: row.registrationNumber, make: row.make, model: row.model, color: row.color } : null;
    booking.vehicleType = row.vehicleTypeName ? { name: row.vehicleTypeName, seatingCapacity: row.seatingCapacity } : null;

    sendSuccess(res, { ...booking, statusHistory, payments });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, note, adminOverride, overrideReason, startKm, endKm, tolls, parking } = req.body;

  let completedWithoutPayment = false;
  let bookingData: any = null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[booking]]: any = await connection.execute(
      `SELECT b.*, c.userId as customerUserId, u.mobile as customerMobile, u.email as customerEmail, c.fullName as customerName
       FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN users u ON c.userId = u.id WHERE b.id = ? FOR UPDATE`, [id]
    );
    if (!booking) { await connection.rollback(); sendNotFound(res, 'Booking not found'); return; }
    bookingData = booking;

    if (req.user?.role === Role.CUSTOMER) { await connection.rollback(); sendForbidden(res); return; }

    if (req.user?.role === Role.DRIVER) {
      const [[driver]]: any = await connection.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user.userId]);
      if (!driver || booking.driverId !== driver.id) {
        await connection.rollback(); sendForbidden(res, 'You are not assigned to this booking.'); return;
      }
    }

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
    if (!allowedNext.includes(status)) { await connection.rollback(); sendError(res, `Cannot transition from ${booking.status} to ${status}.`, 400); return; }

    if (status === BookingStatus.TRIP_COMPLETED) {
      const isPaid = Number(booking.paidAmount || 0) >= Number(booking.totalAmount || 0);
      if (!isPaid) {
        if (req.user?.role === Role.ADMIN && adminOverride === true) {
          if (!overrideReason || String(overrideReason).trim().length === 0) {
            await connection.rollback(); sendError(res, 'A reason is required to complete a trip without full payment.', 400); return;
          }
          completedWithoutPayment = true;
        } else {
          await connection.rollback(); sendError(res, 'Payment pending. Confirm payment before completing the trip.', 400); return;
        }
      }
    }

    const historyId = uuidv4();
    
    // Build update query dynamically
    let updateQuery = 'UPDATE bookings SET status = ?';
    const updateParams: any[] = [status];

    if (startKm !== undefined) { updateQuery += ', startKm = ?'; updateParams.push(startKm); }
    if (endKm !== undefined) { updateQuery += ', endKm = ?'; updateParams.push(endKm); }
    if (tolls !== undefined) { updateQuery += ', tollCharges = ?'; updateParams.push(tolls); }
    if (parking !== undefined) { updateQuery += ', parkingCharges = ?'; updateParams.push(parking); }
    
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);
    
    await connection.execute(updateQuery, updateParams);
    
    await connection.execute(
      'INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [historyId, id, status, note || null, req.user?.userId || null, req.user?.role || null]
    );
    if (status === BookingStatus.TRIP_COMPLETED || status === BookingStatus.CANCELLED || status === BookingStatus.CONFIRMED) {
      if (booking.driverId) await connection.execute('UPDATE driver_profiles SET status = "AVAILABLE" WHERE id = ?', [booking.driverId]);
      if (booking.vehicleId) await connection.execute('UPDATE vehicles SET status = "AVAILABLE" WHERE id = ?', [booking.vehicleId]);
      
      // If a trip is rejected/unassigned back to CONFIRMED, clear the assignments
      if (status === BookingStatus.CONFIRMED) {
        await connection.execute('UPDATE bookings SET driverId = NULL, vehicleId = NULL WHERE id = ?', [id]);
      }
    }
    
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    console.error(e);
    sendError(res, 'Internal server error');
    return;
  } finally {
    connection.release();
  }

  try {
    if (completedWithoutPayment) {
      await createAuditLog({
        userId: req.user!.userId, userRole: req.user!.role,
        action: 'TRIP_COMPLETED_WITHOUT_PAYMENT', entity: 'Booking', entityId: id,
        description: `Booking ${bookingData.bookingNumber} completed without full payment. Reason: ${overrideReason}`,
        metadata: { totalAmount: bookingData.totalAmount, paidAmount: bookingData.paidAmount, reason: overrideReason },
        ipAddress: req.ip,
      });
    }

    const notifMap: Record<string, { type: NotificationType; title: string; message: string }> = {
      CONFIRMED: { type: NotificationType.BOOKING_CONFIRMED, title: 'Booking Confirmed', message: `Your booking ${bookingData.bookingNumber} has been confirmed.` },
      DRIVER_ASSIGNED: { type: NotificationType.DRIVER_ASSIGNED, title: 'Driver Assigned', message: `A driver has been assigned to your booking ${bookingData.bookingNumber}.` },
      DRIVER_ACCEPTED: { type: NotificationType.DRIVER_ACCEPTED, title: 'Driver Accepted', message: `Your driver has accepted the trip for booking ${bookingData.bookingNumber}.` },
      DRIVER_ON_THE_WAY: { type: NotificationType.DRIVER_ON_THE_WAY, title: 'Driver On The Way', message: `Your driver is on the way for booking ${bookingData.bookingNumber}.` },
      TRIP_STARTED: { type: NotificationType.TRIP_STARTED, title: 'Trip Started', message: `Your trip has started for booking ${bookingData.bookingNumber}.` },
      TRIP_COMPLETED: { type: NotificationType.TRIP_COMPLETED, title: 'Trip Completed', message: `Your trip has been completed.` },
      CANCELLED: { type: NotificationType.BOOKING_CANCELLED, title: 'Booking Cancelled', message: `Your booking ${bookingData.bookingNumber} has been cancelled.` },
    };

    if (notifMap[status] && bookingData.customerUserId) {
      await createNotification(bookingData.customerUserId, notifMap[status].type, notifMap[status].title, notifMap[status].message, 'Booking', id);
    }
    if (status === BookingStatus.CONFIRMED && bookingData.customerEmail) {
      await sendBookingConfirmedEmail(bookingData.customerEmail, bookingData.customerName || 'Customer', bookingData.bookingNumber, `₹${Number(bookingData.totalAmount).toLocaleString('en-IN')}`, id);
    }
    if (status === BookingStatus.CANCELLED && bookingData.customerMobile) {
      await sendBookingCancellation(bookingData.customerMobile, bookingData.customerName || 'Customer', bookingData.bookingNumber, id);
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Booking', entityId: id, description: `Booking ${bookingData.bookingNumber} status changed to ${status}`, ipAddress: req.ip });
    sendSuccess(res, null, `Booking status updated to ${status}`);
  } catch (err) {
    console.error("Post-transaction error:", err);
    sendSuccess(res, null, `Booking status updated to ${status} (some notifications failed)`);
  }
};

export const assignDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { driverId } = req.body;

  let assignedDriverName = '';
  let customerMobile = '';
  let customerId = '';
  let bookingNumberStr = '';
  let vehicleId = '';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[booking]]: any = await connection.execute('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [id]);
    if (!booking) { await connection.rollback(); sendNotFound(res, 'Booking not found'); return; }
    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      await connection.rollback(); sendError(res, 'Driver can only be assigned to confirmed or pending bookings.', 400); return;
    }

    const [[driver]]: any = await connection.execute('SELECT * FROM driver_profiles WHERE id = ? FOR UPDATE', [driverId]);
    if (!driver) { await connection.rollback(); sendNotFound(res, 'Driver not found'); return; }
    if (driver.status !== DriverStatus.AVAILABLE) { await connection.rollback(); sendError(res, 'Selected driver is not available.', 400); return; }

    const [[conflict]]: any = await connection.execute(
      `SELECT bookingNumber FROM bookings
       WHERE driverId = ? AND id != ? AND DATE(pickupDate) = DATE(?)
         AND status IN ('DRIVER_ASSIGNED','DRIVER_ACCEPTED','DRIVER_ON_THE_WAY','ARRIVED','TRIP_STARTED')
       LIMIT 1 FOR UPDATE`,
      [driverId, id, booking.pickupDate]
    );
    if (conflict) { await connection.rollback(); sendError(res, `Driver is already assigned to booking ${conflict.bookingNumber} on this date.`, 409); return; }

    const historyId = uuidv4();
    await connection.execute('UPDATE bookings SET driverId = ?, status = ? WHERE id = ?', [driverId, BookingStatus.DRIVER_ASSIGNED, id]);
    await connection.execute('UPDATE driver_profiles SET status = "ON_TRIP" WHERE id = ?', [driverId]);
    await connection.execute(
      'INSERT INTO booking_status_history (id, bookingId, status, note, changedBy, changedByRole, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [historyId, id, BookingStatus.DRIVER_ASSIGNED, `Driver ${driver.fullName} assigned`, req.user?.userId || null, req.user?.role || null]
    );
    
    assignedDriverName = driver.fullName;
    customerId = booking.customerId;
    bookingNumberStr = booking.bookingNumber;
    vehicleId = booking.vehicleId;

    await connection.commit();
  } catch (e) {
    await connection.rollback();
    console.error(e);
    sendError(res, 'Internal server error');
    return;
  } finally {
    connection.release();
  }

  try {
    const [[customer]]: any = await pool.execute(
      `SELECT u.id as userId, u.mobile FROM customer_profiles c JOIN users u ON c.userId = u.id WHERE c.id = ?`, [customerId]
    );
    
    // Attempt notifications (these shouldn't fail the request if they error out, but we await them for correctness)
    const [[driverUser]]: any = await pool.execute('SELECT userId FROM driver_profiles WHERE id = ?', [driverId]);
    if (driverUser) {
      await createNotification(driverUser.userId, NotificationType.DRIVER_ASSIGNED, 'New Trip Assigned', `You have been assigned a new trip. Booking: ${bookingNumberStr}`, 'Booking', id);
    }

    if (customer) {
      await createNotification(customer.userId, NotificationType.DRIVER_ASSIGNED, 'Driver Assigned', `Driver ${assignedDriverName} has been assigned to your booking ${bookingNumberStr}.`, 'Booking', id);
      if (customer.mobile && vehicleId) {
        const [[vehicle]]: any = await pool.execute('SELECT registrationNumber FROM vehicles WHERE id = ?', [vehicleId]);
        await sendDriverAssignment(customer.mobile, '', assignedDriverName, vehicle?.registrationNumber || 'TBD', id);
      }
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_DRIVER', entity: 'Booking', entityId: id, description: `Driver ${assignedDriverName} assigned`, ipAddress: req.ip });
    sendSuccess(res, null, 'Driver assigned successfully');
  } catch (err) {
    console.error("Post-transaction error:", err);
    sendSuccess(res, null, 'Driver assigned successfully (some notifications may have failed)');
  }
};

export const assignVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { vehicleId } = req.body;

  let vehicleReg = '';
  let bookingNum = '';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[booking]]: any = await connection.execute('SELECT id, bookingNumber, pickupDate FROM bookings WHERE id = ? FOR UPDATE', [id]);
    if (!booking) { await connection.rollback(); sendNotFound(res, 'Booking not found'); return; }

    const [[vehicle]]: any = await connection.execute('SELECT * FROM vehicles WHERE id = ? FOR UPDATE', [vehicleId]);
    if (!vehicle) { await connection.rollback(); sendNotFound(res, 'Vehicle not found'); return; }
    if (vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.INACTIVE) { await connection.rollback(); sendError(res, 'Selected vehicle is not available.', 400); return; }

    const today = new Date();
    const expiredDocs: string[] = [];
    if (vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) < today) expiredDocs.push('insurance');
    if (vehicle.pucExpiry && new Date(vehicle.pucExpiry) < today) expiredDocs.push('PUC');
    if (vehicle.permitExpiry && new Date(vehicle.permitExpiry) < today) expiredDocs.push('permit');
    if (vehicle.fitnessExpiry && new Date(vehicle.fitnessExpiry) < today) expiredDocs.push('fitness certificate');
    if (expiredDocs.length > 0) {
      await connection.rollback(); sendError(res, `Cannot assign this vehicle — its ${expiredDocs.join(', ')} has expired.`, 400); return;
    }

    const [[conflict]]: any = await connection.execute(
      `SELECT bookingNumber FROM bookings
       WHERE vehicleId = ? AND id != ? AND DATE(pickupDate) = DATE(?)
         AND status IN ('DRIVER_ASSIGNED','DRIVER_ACCEPTED','DRIVER_ON_THE_WAY','ARRIVED','TRIP_STARTED')
       LIMIT 1 FOR UPDATE`,
      [vehicleId, id, booking.pickupDate]
    );
    if (conflict) { await connection.rollback(); sendError(res, `Vehicle is already assigned to booking ${conflict.bookingNumber} on this date.`, 409); return; }

    await connection.execute('UPDATE bookings SET vehicleId = ? WHERE id = ?', [vehicleId, id]);
    await connection.execute('UPDATE vehicles SET status = "ON_TRIP" WHERE id = ?', [vehicleId]);
    
    vehicleReg = vehicle.registrationNumber;
    bookingNum = booking.bookingNumber;
    
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    console.error(e);
    sendError(res, 'Internal server error');
    return;
  } finally {
    connection.release();
  }

  try {
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_VEHICLE', entity: 'Booking', entityId: id, description: `Vehicle ${vehicleReg} assigned to booking ${bookingNum}` });
    sendSuccess(res, null, 'Vehicle assigned successfully');
  } catch (err) {
    console.error("Post-transaction error:", err);
    sendSuccess(res, null, 'Vehicle assigned successfully (audit log failed)');
  }
};

// Driver confirms the customer has paid the outstanding balance via the
// admin-configured UPI QR. The amount is never taken from the request body —
// it is always the server-computed remaining balance — and the operation is
// idempotent so a double-tap (or a retried request) cannot double-charge.
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { transactionRef } = req.body;

  try {
    const [[driver]]: any = await pool.execute('SELECT id FROM driver_profiles WHERE userId = ?', [req.user!.userId]);
    if (!driver) { sendError(res, 'Driver profile not found', 404); return; }

    const [[booking]]: any = await pool.execute(
      `SELECT b.*, c.userId as customerUserId, u.mobile as customerMobile, u.email as customerEmail, c.fullName as customerName
       FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN users u ON c.userId = u.id WHERE b.id = ?`,
      [id]
    );
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }
    if (booking.driverId !== driver.id) { sendForbidden(res, 'You are not assigned to this booking.'); return; }

    if (transactionRef !== undefined && transactionRef !== null && String(transactionRef).length > 100) {
      sendError(res, 'Transaction reference is too long.', 400);
      return;
    }

    const paymentNumber = await generatePaymentNumber();
    const paymentId = uuidv4();
    let remaining = 0;
    let alreadyPaid = false;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Row-locked re-read guards against two concurrent confirm requests
      // (double-tap, retried request) both recording a payment.
      const [[freshBooking]]: any = await connection.execute('SELECT paidAmount, totalAmount, bookingNumber FROM bookings WHERE id = ? FOR UPDATE', [id]);
      const paid = Number(freshBooking.paidAmount || 0);
      const total = Number(freshBooking.totalAmount || 0);
      remaining = Math.round((total - paid) * 100) / 100;

      if (remaining <= 0) {
        alreadyPaid = true;
        await connection.commit();
      } else {
        await connection.execute(
          `INSERT INTO payments (id, paymentNumber, bookingId, amount, paymentMethod, status, transactionRef, collectedBy, paymentDate, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'UPI', 'PAID', ?, ?, NOW(), ?, NOW(), NOW())`,
          [paymentId, paymentNumber, id, remaining, transactionRef || null, driver.id, 'Collected by driver via Mailari Travels UPI QR']
        );
        const newPaid = paid + remaining;
        const newStatus = newPaid >= total ? 'PAID' : 'PARTIALLY_PAID';
        await connection.execute('UPDATE bookings SET paidAmount = ?, paymentStatus = ? WHERE id = ?', [newPaid, newStatus, id]);
        await connection.commit();
      }
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    if (alreadyPaid) {
      sendSuccess(res, null, 'Payment already recorded for this booking.');
      return;
    }

    if (booking.customerUserId) {
      await createNotification(booking.customerUserId, NotificationType.PAYMENT_RECEIVED, 'Payment Received', `Payment of ₹${remaining} received for booking ${booking.bookingNumber}.`, 'Payment', paymentId);
      if (booking.customerMobile) await sendPaymentConfirmation(booking.customerMobile, booking.customerName || 'Customer', `₹${remaining}`, booking.bookingNumber, paymentId);
      if (booking.customerEmail) await sendPaymentReceivedEmail(booking.customerEmail, booking.customerName || 'Customer', booking.bookingNumber, `₹${remaining}`, paymentNumber, paymentId);
    }
    await createAuditLog({
      userId: req.user!.userId, userRole: req.user!.role,
      action: 'DRIVER_PAYMENT_CONFIRMED', entity: 'Payment', entityId: paymentId,
      description: `Driver confirmed UPI payment of ₹${remaining} for booking ${booking.bookingNumber}`,
      ipAddress: req.ip,
    });

    const [[payment]]: any = await pool.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
    sendCreated(res, payment, 'Payment confirmed');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  let bookingData: any = null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[booking]]: any = await connection.execute(
      `SELECT b.*, c.userId as customerUserId, u.mobile as customerMobile, c.fullName as customerName
       FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN users u ON c.userId = u.id WHERE b.id = ? FOR UPDATE`, [id]
    );
    if (!booking) { await connection.rollback(); sendNotFound(res, 'Booking not found'); return; }
    bookingData = booking;

    if (booking.status === BookingStatus.TRIP_STARTED || booking.status === BookingStatus.TRIP_COMPLETED) { 
      await connection.rollback(); sendError(res, 'Cannot cancel a trip that has started or completed.', 400); return; 
    }

    if (req.user?.role === Role.CUSTOMER && booking.customerUserId !== req.user.userId) { 
      await connection.rollback(); res.status(403).json({ success: false, message: 'Forbidden' }); return; 
    }

    const historyId = uuidv4();
    
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
    console.error(e);
    sendError(res, 'Internal server error');
    return;
  } finally {
    connection.release();
  }

  try {
    if (bookingData.customerUserId) {
      await createNotification(bookingData.customerUserId, NotificationType.BOOKING_CANCELLED, 'Booking Cancelled', `Your booking ${bookingData.bookingNumber} has been cancelled.`, 'Booking', id);
    }
    if (bookingData.customerMobile) {
      await sendBookingCancellation(bookingData.customerMobile, bookingData.customerName || 'Customer', bookingData.bookingNumber, id);
    }
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CANCEL', entity: 'Booking', entityId: id, description: `Booking cancelled: ${reason || 'N/A'}`, ipAddress: req.ip });
    
    sendSuccess(res, null, 'Booking cancelled successfully');
  } catch (err) {
    console.error("Post-transaction error:", err);
    sendSuccess(res, null, 'Booking cancelled successfully (audit/notifications failed)');
  }
};
