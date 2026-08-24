import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { createAuditLog } from '../utils/helpers';
import { BookingStatus, DriverStatus, VehicleStatus } from '@prisma/client';

export const getTrips = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  let where: Record<string, unknown> = {};

  if (req.user?.role === 'DRIVER') {
    const driver = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!driver) { sendError(res, 'Driver profile not found', 404); return; }
    where.driverId = driver.id;
  }

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      booking: {
        include: {
          customer: { select: { fullName: true, user: { select: { mobile: true } } } },
          vehicle: { select: { registrationNumber: true, make: true, model: true } },
        },
      },
    },
  });
  sendSuccess(res, trips);
};

export const updateTripStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, startOdometer, endOdometer, driverNotes, issueReported } = req.body;

  const trip = await prisma.trip.findUnique({ where: { id }, include: { booking: true } });
  if (!trip) { sendNotFound(res, 'Trip not found'); return; }

  // Validate driver ownership
  if (req.user?.role === 'DRIVER') {
    const driver = await prisma.driverProfile.findUnique({ where: { userId: req.user.userId } });
    if (trip.driverId !== driver?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  }

  const now = new Date();
  const updates: Record<string, unknown> = { driverNotes, issueReported };

  if (status === 'STARTED') {
    updates.startTime = now;
    updates.startOdometer = startOdometer ? parseInt(startOdometer) : null;
    await prisma.booking.update({ where: { id: trip.bookingId }, data: { status: BookingStatus.TRIP_STARTED } });
    await prisma.bookingStatusHistory.create({ data: { bookingId: trip.bookingId, status: BookingStatus.TRIP_STARTED, note: 'Trip started by driver', changedBy: req.user?.userId, changedByRole: req.user?.role } });
  }

  if (status === 'COMPLETED') {
    updates.endTime = now;
    updates.endOdometer = endOdometer ? parseInt(endOdometer) : null;
    if (startOdometer && endOdometer) {
      updates.actualDistance = parseInt(endOdometer) - parseInt(startOdometer);
      updates.actualDuration = trip.startTime ? Math.round((now.getTime() - trip.startTime.getTime()) / 60000) : null;
    }
    await prisma.booking.update({ where: { id: trip.bookingId }, data: { status: BookingStatus.TRIP_COMPLETED } });
    await prisma.bookingStatusHistory.create({ data: { bookingId: trip.bookingId, status: BookingStatus.TRIP_COMPLETED, note: 'Trip completed by driver', changedBy: req.user?.userId, changedByRole: req.user?.role } });
    if (trip.driverId) await prisma.driverProfile.update({ where: { id: trip.driverId }, data: { status: DriverStatus.AVAILABLE } });
    if (trip.vehicleId) await prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: VehicleStatus.AVAILABLE } });
  }

  await prisma.trip.update({ where: { id }, data: updates });

  await createAuditLog({ userId: req.user?.userId, userRole: req.user?.role, action: 'TRIP_UPDATE', entity: 'Trip', entityId: id, description: `Trip status updated to ${status}` });
  sendSuccess(res, null, 'Trip updated successfully');
};
