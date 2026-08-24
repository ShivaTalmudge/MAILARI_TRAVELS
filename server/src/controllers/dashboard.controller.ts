import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { Role, BookingStatus } from '@prisma/client';

export const getAdminDashboard = async (_req: Request, res: Response): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayBookings, upcomingTrips, activeTrips, completedToday,
    cancelledToday, totalCustomers, totalDrivers, totalVehicles,
    availableVehicles, driversOnTrip, pendingPayments,
    monthlyRevenue, bookingsByStatus, recentBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { pickupDate: { gte: today, lt: tomorrow } } }),
    prisma.booking.count({ where: { pickupDate: { gte: tomorrow }, status: { in: [BookingStatus.CONFIRMED, BookingStatus.DRIVER_ASSIGNED] } } }),
    prisma.booking.count({ where: { status: { in: [BookingStatus.TRIP_STARTED, BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.ARRIVED] } } }),
    prisma.booking.count({ where: { status: BookingStatus.TRIP_COMPLETED, updatedAt: { gte: today } } }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED, updatedAt: { gte: today } } }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.user.count({ where: { role: Role.DRIVER } }),
    prisma.vehicle.count({ where: { status: { not: 'INACTIVE' } } }),
    prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
    prisma.driverProfile.count({ where: { status: 'ON_TRIP' } }),
    prisma.booking.aggregate({ where: { paymentStatus: 'PENDING', status: BookingStatus.TRIP_COMPLETED }, _sum: { totalAmount: true } }),
    // Monthly revenue (last 6 months)
    prisma.payment.groupBy({
      by: ['paymentDate'],
      where: { status: 'PAID', paymentDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
      _sum: { amount: true },
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.booking.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { fullName: true } }, vehicleType: { select: { name: true } } },
    }),
  ]);

  sendSuccess(res, {
    stats: {
      todayBookings, upcomingTrips, activeTrips, completedToday, cancelledToday,
      totalCustomers, totalDrivers, totalVehicles, availableVehicles, driversOnTrip,
      pendingPaymentsAmount: pendingPayments._sum.totalAmount || 0,
    },
    charts: { monthlyRevenue, bookingsByStatus },
    recentBookings,
  });
};

export const getCustomerDashboard = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const profile = await prisma.customerProfile.findUnique({ where: { userId } });
  if (!profile) { sendError(res, 'Profile not found', 404); return; }

  const [activeBooking, upcomingBooking, recentBookings, totalBookings, pendingPayment, notifications] = await Promise.all([
    prisma.booking.findFirst({ where: { customerId: profile.id, status: { in: [BookingStatus.TRIP_STARTED, BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.ARRIVED] } }, include: { driver: { select: { fullName: true, user: { select: { mobile: true } } } }, vehicle: { select: { registrationNumber: true, make: true, model: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.booking.findFirst({ where: { customerId: profile.id, pickupDate: { gte: new Date() }, status: { in: [BookingStatus.CONFIRMED, BookingStatus.DRIVER_ASSIGNED] } }, include: { driver: { select: { fullName: true } }, vehicle: { select: { registrationNumber: true, make: true, model: true } }, vehicleType: { select: { name: true } } }, orderBy: { pickupDate: 'asc' } }),
    prisma.booking.findMany({ where: { customerId: profile.id }, orderBy: { createdAt: 'desc' }, take: 5, include: { vehicleType: { select: { name: true } } } }),
    prisma.booking.count({ where: { customerId: profile.id } }),
    prisma.booking.aggregate({ where: { customerId: profile.id, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } }, _sum: { totalAmount: true } }),
    prisma.notification.findMany({ where: { userId, isRead: false }, take: 5, orderBy: { createdAt: 'desc' } }),
  ]);

  sendSuccess(res, { activeBooking, upcomingBooking, recentBookings, totalBookings, pendingPaymentAmount: pendingPayment._sum.totalAmount || 0, notifications });
};

export const getDriverDashboard = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const driver = await prisma.driverProfile.findUnique({ where: { userId }, include: { assignedVehicle: { include: { vehicleType: true } } } });
  if (!driver) { sendError(res, 'Driver profile not found', 404); return; }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayTrips, activeTrip, upcomingTrips, completedTrips, totalEarnings, notifications] = await Promise.all([
    prisma.booking.count({ where: { driverId: driver.id, pickupDate: { gte: today, lt: tomorrow } } }),
    prisma.booking.findFirst({ where: { driverId: driver.id, status: { in: [BookingStatus.TRIP_STARTED, BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.ARRIVED, BookingStatus.DRIVER_ACCEPTED] } }, include: { customer: { select: { fullName: true, user: { select: { mobile: true } } } }, vehicle: { select: { registrationNumber: true, make: true, model: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.booking.findMany({ where: { driverId: driver.id, pickupDate: { gte: new Date() }, status: { in: [BookingStatus.DRIVER_ASSIGNED, BookingStatus.CONFIRMED] } }, include: { customer: { select: { fullName: true } }, vehicleType: { select: { name: true } } }, orderBy: { pickupDate: 'asc' }, take: 5 }),
    prisma.booking.count({ where: { driverId: driver.id, status: BookingStatus.TRIP_COMPLETED } }),
    prisma.booking.aggregate({ where: { driverId: driver.id, status: BookingStatus.TRIP_COMPLETED }, _sum: { totalAmount: true } }),
    prisma.notification.findMany({ where: { userId, isRead: false }, take: 5, orderBy: { createdAt: 'desc' } }),
  ]);

  sendSuccess(res, { driver, todayTrips, activeTrip, upcomingTrips, completedTrips, totalEarnings: totalEarnings._sum.totalAmount || 0, notifications });
};
