import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { getPaginationParams } from '../utils/helpers';

const getDateFilter = (fromDate?: string, toDate?: string) => {
  if (!fromDate && !toDate) return undefined;
  return {
    ...(fromDate ? { gte: new Date(fromDate) } : {}),
    ...(toDate ? { lte: new Date(toDate) } : {}),
  };
};

export const getBookingReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate, status, tripType, driverId } = req.query as Record<string, string | undefined>;
  const dateFilter = getDateFilter(fromDate, toDate);

  const where = {
    ...(dateFilter ? { pickupDate: dateFilter } : {}),
    ...(status ? { status: status as any } : {}),
    ...(tripType ? { tripType: tripType as any } : {}),
    ...(driverId ? { driverId } : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { pickupDate: 'desc' },
    include: {
      customer: { select: { fullName: true, user: { select: { mobile: true } } } },
      driver: { select: { fullName: true } },
      vehicle: { select: { registrationNumber: true, make: true, model: true } },
      vehicleType: { select: { name: true } },
    },
  });

  const summary = {
    total: bookings.length,
    totalRevenue: bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0),
    byStatus: {} as Record<string, number>,
    byTripType: {} as Record<string, number>,
  };
  bookings.forEach(b => {
    summary.byStatus[b.status] = (summary.byStatus[b.status] || 0) + 1;
    summary.byTripType[b.tripType] = (summary.byTripType[b.tripType] || 0) + 1;
  });

  sendSuccess(res, { summary, bookings });
};

export const getRevenueReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate } = req.query as Record<string, string | undefined>;
  const dateFilter = getDateFilter(fromDate, toDate);

  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAID',
      ...(dateFilter ? { paymentDate: dateFilter } : {}),
    },
    include: { booking: { select: { bookingNumber: true, tripType: true, customer: { select: { fullName: true } } } } },
    orderBy: { paymentDate: 'desc' },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const byMethod: Record<string, number> = {};
  payments.forEach(p => { byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + Number(p.amount); });

  sendSuccess(res, { totalRevenue, totalPayments: payments.length, byMethod, payments });
};

export const getGstReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate } = req.query as Record<string, string | undefined>;
  const dateFilter = getDateFilter(fromDate, toDate);

  const invoices = await prisma.invoice.findMany({
    where: dateFilter ? { createdAt: dateFilter } : {},
    include: { booking: { select: { bookingNumber: true, customer: { select: { fullName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const totals = invoices.reduce((acc, inv) => ({
    subtotal: acc.subtotal + Number(inv.subtotal),
    cgst: acc.cgst + Number(inv.cgst),
    sgst: acc.sgst + Number(inv.sgst),
    igst: acc.igst + Number(inv.igst),
    taxTotal: acc.taxTotal + Number(inv.taxTotal),
    totalAmount: acc.totalAmount + Number(inv.totalAmount),
  }), { subtotal: 0, cgst: 0, sgst: 0, igst: 0, taxTotal: 0, totalAmount: 0 });

  sendSuccess(res, { totals, invoices });
};

export const getDriverReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate, driverId } = req.query as Record<string, string | undefined>;
  const dateFilter = getDateFilter(fromDate, toDate);

  const bookings = await prisma.booking.groupBy({
    by: ['driverId'],
    where: {
      driverId: { not: null },
      ...(driverId ? { driverId } : {}),
      ...(dateFilter ? { pickupDate: dateFilter } : {}),
    },
    _count: { id: true },
    _sum: { totalAmount: true },
  });

  const drivers = await Promise.all(
    bookings.map(async b => {
      const driver = b.driverId ? await prisma.driverProfile.findUnique({ where: { id: b.driverId }, select: { fullName: true, licenceNumber: true } }) : null;
      return { driverId: b.driverId, driver, totalTrips: b._count.id, totalRevenue: b._sum.totalAmount };
    })
  );

  sendSuccess(res, drivers);
};

export const getVehicleReport = async (req: Request, res: Response): Promise<void> => {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      vehicleType: { select: { name: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { registrationNumber: 'asc' },
  });
  sendSuccess(res, vehicles);
};

export const getCustomerReport = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const customers = await prisma.customerProfile.findMany({
    skip, take,
    include: {
      user: { select: { mobile: true, email: true, status: true, createdAt: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const total = await prisma.customerProfile.count();
  sendSuccess(res, customers, 'Customers', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};
