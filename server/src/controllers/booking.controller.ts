import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { getPaginationParams, generateBookingNumber, createAuditLog } from '../utils/helpers';
import { createNotification } from '../services/notification.service';
import { BookingStatus, Role, NotificationType, DriverStatus, VehicleStatus } from '@prisma/client';

const BOOKING_INCLUDE = {
  customer: { select: { fullName: true, user: { select: { mobile: true, email: true } } } },
  driver: { select: { fullName: true, user: { select: { mobile: true, email: true, id: true } } } },
  vehicle: { select: { registrationNumber: true, make: true, model: true, color: true } },
  vehicleType: { select: { name: true } },
  statusHistory: { orderBy: { createdAt: 'desc' as const } },
};

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status, tripType, fromDate, toDate, driverId } = req.query as Record<string, string | undefined>;

  let where: Record<string, unknown> = {};

  // Role-based scoping
  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!profile) { sendError(res, 'Profile not found', 404); return; }
    where.customerId = profile.id;
  } else if (req.user?.role === Role.DRIVER) {
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.user.userId } });
    if (!profile) { sendError(res, 'Profile not found', 404); return; }
    where.driverId = profile.id;
  }

  if (status) where.status = status;
  if (tripType) where.tripType = tripType;
  if (driverId) where.driverId = driverId;
  if (fromDate || toDate) {
    where.pickupDate = {
      ...(fromDate ? { gte: new Date(fromDate) } : {}),
      ...(toDate ? { lte: new Date(toDate) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { bookingNumber: { contains: search } },
      { customer: { fullName: { contains: search } } },
      { customer: { user: { mobile: { contains: search } } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: BOOKING_INCLUDE }),
    prisma.booking.count({ where }),
  ]);

  sendSuccess(res, bookings, 'Bookings fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  let customerId: string;

  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!profile) { sendError(res, 'Customer profile not found', 404); return; }
    customerId = profile.id;
  } else {
    // Admin can specify customer
    if (!data.customerId) { sendError(res, 'customerId is required when creating a booking as admin.', 400); return; }
    customerId = data.customerId;
  }

  // ── SECURITY: Always calculate pricing server-side. Never trust client-supplied fare fields ──
  const { calculateFare } = await import('../services/pricing.service');
  const pickupHour = data.pickupTime ? parseInt((data.pickupTime as string).split(':')[0], 10) : 12;
  const isNightTrip = pickupHour >= 22 || pickupHour < 6;

  const fareResult = await calculateFare({
    vehicleTypeId: data.vehicleTypeId,
    tripType: data.tripType,
    estimatedDistance: data.estimatedDistance ? parseFloat(data.estimatedDistance) : undefined,
    estimatedDuration: data.estimatedDuration ? parseFloat(data.estimatedDuration) : undefined,
    isNightTrip,
    hasAirport: Boolean(data.hasAirport),
    hasStateCrossing: Boolean(data.hasStateCrossing),
    tollCharges: data.tollCharges ? parseFloat(data.tollCharges) : 0,
    parkingCharges: data.parkingCharges ? parseFloat(data.parkingCharges) : 0,
    extraCharges: data.extraCharges ? parseFloat(data.extraCharges) : 0,
    // Only admins can apply discounts
    discount: req.user?.role === Role.ADMIN && data.discount ? parseFloat(data.discount) : 0,
  });

  const bookingNumber = await generateBookingNumber();

  const booking = await prisma.booking.create({
    data: {
      bookingNumber,
      customerId,
      vehicleTypeId: data.vehicleTypeId,
      tripType: data.tripType,
      status: BookingStatus.PENDING,
      pickupLocation: data.pickupLocation,
      dropLocation: data.dropLocation,
      pickupDate: new Date(data.pickupDate),
      pickupTime: data.pickupTime,
      returnDate: data.returnDate ? new Date(data.returnDate) : null,
      passengerCount: parseInt(data.passengerCount || '1'),
      luggageCount: parseInt(data.luggageCount || '0'),
      estimatedDistance: data.estimatedDistance ? parseFloat(data.estimatedDistance) : null,
      estimatedDuration: data.estimatedDuration ? parseInt(data.estimatedDuration) : null,
      flightNumber: data.flightNumber,
      flightType: data.flightType,
      // Use server-calculated values ONLY
      baseFare: fareResult.baseFare,
      distanceCharges: fareResult.distanceCharges,
      driverAllowance: fareResult.driverAllowance,
      tollCharges: fareResult.tollCharges,
      parkingCharges: fareResult.parkingCharges,
      airportCharges: fareResult.airportCharges,
      nightCharges: fareResult.nightCharges,
      statePermitCharges: fareResult.statePermitCharges,
      extraCharges: fareResult.extraCharges,
      discount: fareResult.discount,
      subtotal: fareResult.subtotal,
      taxAmount: fareResult.taxAmount,
      totalAmount: fareResult.totalAmount,
      specialInstructions: data.specialInstructions,
      statusHistory: { create: { status: BookingStatus.PENDING, note: 'Booking created', changedBy: req.user?.userId, changedByRole: req.user?.role } },
    },
    include: BOOKING_INCLUDE,
  });

  // Notify customer
  const customerUserId = await prisma.customerProfile.findUnique({ where: { id: customerId }, select: { userId: true } });
  if (customerUserId) {
    await createNotification(customerUserId.userId, NotificationType.BOOKING_CREATED, 'Booking Received', `Your booking ${bookingNumber} has been received. We will confirm it shortly.`, 'Booking', booking.id);
  }

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
  for (const admin of admins) {
    await createNotification(admin.id, NotificationType.BOOKING_CREATED, 'New Booking', `New booking ${bookingNumber} received from ${data.pickupLocation}.`, 'Booking', booking.id);
  }

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Booking', entityId: booking.id, description: `Booking created: ${bookingNumber} | Total: ₹${fareResult.totalAmount}`, ipAddress: req.ip });
  sendCreated(res, booking, `Booking ${bookingNumber} created successfully`);
};


export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { ...BOOKING_INCLUDE, trips: true, payments: true, invoice: { include: { items: true } } },
  });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }

  // Scope check
  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (booking.customerId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  }
  if (req.user?.role === Role.DRIVER) {
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.user.userId } });
    if (booking.driverId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  }

  sendSuccess(res, booking);
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, note } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id }, include: { customer: { include: { user: true } } } });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }

  // Valid state machine transitions
  const VALID_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
    [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED],
    [BookingStatus.CONFIRMED]: [BookingStatus.DRIVER_ASSIGNED, BookingStatus.CANCELLED],
    [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_ACCEPTED, BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    [BookingStatus.DRIVER_ACCEPTED]: [BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.CANCELLED],
    [BookingStatus.DRIVER_ON_THE_WAY]: [BookingStatus.ARRIVED],
    [BookingStatus.ARRIVED]: [BookingStatus.TRIP_STARTED],
    [BookingStatus.TRIP_STARTED]: [BookingStatus.TRIP_COMPLETED],
  };

  const allowedNext = VALID_TRANSITIONS[booking.status] || [];
  if (!allowedNext.includes(status as BookingStatus)) {
    sendError(res, `Cannot transition from ${booking.status} to ${status}.`, 400);
    return;
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status } }),
    prisma.bookingStatusHistory.create({ data: { bookingId: id, status, note, changedBy: req.user?.userId, changedByRole: req.user?.role } }),
  ]);

  // Notifications
  const notifMap: Record<string, { type: NotificationType; title: string; message: string }> = {
    CONFIRMED: { type: NotificationType.BOOKING_CONFIRMED, title: 'Booking Confirmed', message: `Your booking ${booking.bookingNumber} has been confirmed.` },
    DRIVER_ASSIGNED: { type: NotificationType.DRIVER_ASSIGNED, title: 'Driver Assigned', message: `A driver has been assigned to your booking ${booking.bookingNumber}.` },
    DRIVER_ACCEPTED: { type: NotificationType.DRIVER_ACCEPTED, title: 'Driver Accepted', message: `Your driver has accepted the trip for booking ${booking.bookingNumber}.` },
    DRIVER_ON_THE_WAY: { type: NotificationType.DRIVER_ON_THE_WAY, title: 'Driver On The Way', message: `Your driver is on the way for booking ${booking.bookingNumber}.` },
    TRIP_STARTED: { type: NotificationType.TRIP_STARTED, title: 'Trip Started', message: `Your trip has started for booking ${booking.bookingNumber}.` },
    TRIP_COMPLETED: { type: NotificationType.TRIP_COMPLETED, title: 'Trip Completed', message: `Your trip has been completed. Thank you for choosing Mailari Travels!` },
    CANCELLED: { type: NotificationType.BOOKING_CANCELLED, title: 'Booking Cancelled', message: `Your booking ${booking.bookingNumber} has been cancelled.` },
  };

  if (notifMap[status]) {
    await createNotification(booking.customer.userId, notifMap[status].type, notifMap[status].title, notifMap[status].message, 'Booking', id);
  }

  if (status === BookingStatus.TRIP_COMPLETED) {
    if (booking.driverId) await prisma.driverProfile.update({ where: { id: booking.driverId }, data: { status: DriverStatus.AVAILABLE } });
    if (booking.vehicleId) await prisma.vehicle.update({ where: { id: booking.vehicleId }, data: { status: VehicleStatus.AVAILABLE } });
  }

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Booking', entityId: id, description: `Booking ${booking.bookingNumber} status changed to ${status}`, ipAddress: req.ip });
  sendSuccess(res, null, `Booking status updated to ${status}`);
};

export const assignDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { driverId } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }
  if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
    sendError(res, 'Driver can only be assigned to confirmed or pending bookings.', 400); return;
  }

  const driver = await prisma.driverProfile.findUnique({ where: { id: driverId }, include: { user: true } });
  if (!driver) { sendNotFound(res, 'Driver not found'); return; }
  if (driver.status !== DriverStatus.AVAILABLE) {
    sendError(res, 'Selected driver is not available.', 400); return;
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { driverId, status: BookingStatus.DRIVER_ASSIGNED } }),
    prisma.driverProfile.update({ where: { id: driverId }, data: { status: DriverStatus.ON_TRIP } }),
    prisma.bookingStatusHistory.create({ data: { bookingId: id, status: BookingStatus.DRIVER_ASSIGNED, note: `Driver ${driver.fullName} assigned`, changedBy: req.user?.userId, changedByRole: req.user?.role } }),
  ]);

  // Notify driver
  await createNotification(driver.userId, NotificationType.DRIVER_ASSIGNED, 'New Trip Assigned', `You have been assigned a new trip. Booking: ${booking.bookingNumber}`, 'Booking', id);

  // Notify customer
  const customer = await prisma.customerProfile.findUnique({ where: { id: booking.customerId } });
  if (customer) {
    await createNotification(customer.userId, NotificationType.DRIVER_ASSIGNED, 'Driver Assigned', `Driver ${driver.fullName} has been assigned to your booking ${booking.bookingNumber}.`, 'Booking', id);
  }

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_DRIVER', entity: 'Booking', entityId: id, description: `Driver ${driver.fullName} assigned to booking ${booking.bookingNumber}`, ipAddress: req.ip });
  sendSuccess(res, null, 'Driver assigned successfully');
};

export const assignVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { vehicleId } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }
  if (vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.INACTIVE) {
    sendError(res, 'Selected vehicle is not available.', 400); return;
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { vehicleId } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { status: VehicleStatus.ON_TRIP } }),
  ]);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_VEHICLE', entity: 'Booking', entityId: id, description: `Vehicle ${vehicle.registrationNumber} assigned to booking ${booking.bookingNumber}` });
  sendSuccess(res, null, 'Vehicle assigned successfully');
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id }, include: { customer: { include: { user: true } } } });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }

  if (booking.status === BookingStatus.TRIP_STARTED || booking.status === BookingStatus.TRIP_COMPLETED) {
    sendError(res, 'Cannot cancel a trip that has started or completed.', 400); return;
  }

  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (booking.customerId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  }

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } }),
    prisma.bookingStatusHistory.create({ data: { bookingId: id, status: BookingStatus.CANCELLED, note: reason || 'Cancelled', changedBy: req.user?.userId, changedByRole: req.user?.role } }),
    ...(booking.driverId ? [prisma.driverProfile.update({ where: { id: booking.driverId }, data: { status: DriverStatus.AVAILABLE } })] : []),
    ...(booking.vehicleId ? [prisma.vehicle.update({ where: { id: booking.vehicleId }, data: { status: VehicleStatus.AVAILABLE } })] : []),
  ]);

  await createNotification(booking.customer.userId, NotificationType.BOOKING_CANCELLED, 'Booking Cancelled', `Your booking ${booking.bookingNumber} has been cancelled.`, 'Booking', id);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CANCEL', entity: 'Booking', entityId: id, description: `Booking ${booking.bookingNumber} cancelled. Reason: ${reason || 'N/A'}`, ipAddress: req.ip });
  sendSuccess(res, null, 'Booking cancelled successfully');
};
