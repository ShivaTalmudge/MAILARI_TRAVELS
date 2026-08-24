import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { getPaginationParams } from '../utils/helpers';

export const getBookingReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate, status, tripType, driverId } = req.query as Record<string, string | undefined>;
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (fromDate) { whereClause += ' AND b.pickupDate >= ?'; params.push(new Date(fromDate)); }
    if (toDate) { whereClause += ' AND b.pickupDate <= ?'; params.push(new Date(toDate)); }
    if (status) { whereClause += ' AND b.status = ?'; params.push(status); }
    if (tripType) { whereClause += ' AND b.tripType = ?'; params.push(tripType); }
    if (driverId) { whereClause += ' AND b.driverId = ?'; params.push(driverId); }

    const [bookingsRaw]: any = await pool.execute(
      `SELECT b.*, c.fullName as customerName, u.mobile as customerMobile, d.fullName as driverName, v.registrationNumber, v.make, v.model, vt.name as vehicleTypeName
       FROM bookings b
       LEFT JOIN customer_profiles c ON b.customerId = c.id
       LEFT JOIN users u ON c.userId = u.id
       LEFT JOIN driver_profiles d ON b.driverId = d.id
       LEFT JOIN vehicles v ON b.vehicleId = v.id
       LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id
       ${whereClause} ORDER BY b.pickupDate DESC`, params
    );

    const summary = { total: bookingsRaw.length, totalRevenue: 0, byStatus: {} as Record<string, number>, byTripType: {} as Record<string, number> };
    const bookings = bookingsRaw.map((b: any) => {
      summary.totalRevenue += Number(b.totalAmount || 0);
      summary.byStatus[b.status] = (summary.byStatus[b.status] || 0) + 1;
      summary.byTripType[b.tripType] = (summary.byTripType[b.tripType] || 0) + 1;
      return {
        ...b,
        customer: b.customerName ? { fullName: b.customerName, user: { mobile: b.customerMobile } } : null,
        driver: b.driverName ? { fullName: b.driverName } : null,
        vehicle: b.registrationNumber ? { registrationNumber: b.registrationNumber, make: b.make, model: b.model } : null,
        vehicleType: b.vehicleTypeName ? { name: b.vehicleTypeName } : null
      };
    });
    sendSuccess(res, { summary, bookings });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getRevenueReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate } = req.query as Record<string, string | undefined>;
  try {
    let whereClause = 'WHERE p.status = "PAID"';
    const params: any[] = [];
    if (fromDate) { whereClause += ' AND p.paymentDate >= ?'; params.push(new Date(fromDate)); }
    if (toDate) { whereClause += ' AND p.paymentDate <= ?'; params.push(new Date(toDate)); }

    const [paymentsRaw]: any = await pool.execute(
      `SELECT p.*, b.bookingNumber, b.tripType, c.fullName as customerName
       FROM payments p LEFT JOIN bookings b ON p.bookingId = b.id LEFT JOIN customer_profiles c ON b.customerId = c.id
       ${whereClause} ORDER BY p.paymentDate DESC`, params
    );

    let totalRevenue = 0;
    const byMethod: Record<string, number> = {};
    const payments = paymentsRaw.map((p: any) => {
      totalRevenue += Number(p.amount);
      byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + Number(p.amount);
      return { ...p, booking: p.bookingNumber ? { bookingNumber: p.bookingNumber, tripType: p.tripType, customer: p.customerName ? { fullName: p.customerName } : null } : null };
    });
    sendSuccess(res, { totalRevenue, totalPayments: payments.length, byMethod, payments });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getGstReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate } = req.query as Record<string, string | undefined>;
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (fromDate) { whereClause += ' AND i.createdAt >= ?'; params.push(new Date(fromDate)); }
    if (toDate) { whereClause += ' AND i.createdAt <= ?'; params.push(new Date(toDate)); }

    const [invoicesRaw]: any = await pool.execute(
      `SELECT i.*, b.bookingNumber, c.fullName as customerName
       FROM invoices i LEFT JOIN bookings b ON i.bookingId = b.id LEFT JOIN customer_profiles c ON b.customerId = c.id
       ${whereClause} ORDER BY i.createdAt DESC`, params
    );

    const totals = { subtotal: 0, cgst: 0, sgst: 0, igst: 0, taxTotal: 0, totalAmount: 0 };
    const invoices = invoicesRaw.map((i: any) => {
      totals.subtotal += Number(i.subtotal); totals.cgst += Number(i.cgst); totals.sgst += Number(i.sgst);
      totals.igst += Number(i.igst); totals.taxTotal += Number(i.taxTotal); totals.totalAmount += Number(i.totalAmount);
      return { ...i, booking: i.bookingNumber ? { bookingNumber: i.bookingNumber, customer: i.customerName ? { fullName: i.customerName } : null } : null };
    });
    sendSuccess(res, { totals, invoices });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getDriverReport = async (req: Request, res: Response): Promise<void> => {
  const { fromDate, toDate, driverId } = req.query as Record<string, string | undefined>;
  try {
    let whereClause = 'WHERE driverId IS NOT NULL';
    const params: any[] = [];
    if (driverId) { whereClause += ' AND driverId = ?'; params.push(driverId); }
    if (fromDate) { whereClause += ' AND pickupDate >= ?'; params.push(new Date(fromDate)); }
    if (toDate) { whereClause += ' AND pickupDate <= ?'; params.push(new Date(toDate)); }

    const [bookingsRaw]: any = await pool.execute(
      `SELECT driverId, COUNT(id) as _count_id, SUM(totalAmount) as _sum_totalAmount
       FROM bookings ${whereClause} GROUP BY driverId`, params
    );

    const drivers = [];
    for (const b of bookingsRaw) {
      let driver = null;
      if (b.driverId) {
        const [[d]]: any = await pool.execute('SELECT fullName, licenceNumber FROM driver_profiles WHERE id = ?', [b.driverId]);
        driver = d;
      }
      drivers.push({ driverId: b.driverId, driver, totalTrips: b._count_id, totalRevenue: b._sum_totalAmount });
    }
    sendSuccess(res, drivers);
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getVehicleReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [vehiclesRaw]: any = await pool.execute(
      `SELECT v.*, vt.name as vehicleTypeName, (SELECT COUNT(*) FROM bookings b WHERE b.vehicleId = v.id) as bookingsCount
       FROM vehicles v LEFT JOIN vehicle_types vt ON v.vehicleTypeId = vt.id ORDER BY v.registrationNumber ASC`
    );
    const vehicles = vehiclesRaw.map((v: any) => ({ ...v, vehicleType: v.vehicleTypeName ? { name: v.vehicleTypeName } : null, _count: { bookings: v.bookingsCount } }));
    sendSuccess(res, vehicles);
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getCustomerReport = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  try {
    const [[{ total }]]: any = await pool.execute('SELECT COUNT(*) as total FROM customer_profiles');
    const [customersRaw]: any = await pool.execute(
      `SELECT c.*, u.mobile, u.email, u.status, u.createdAt as userCreatedAt,
              (SELECT COUNT(*) FROM bookings b WHERE b.customerId = c.id) as bookingsCount
       FROM customer_profiles c JOIN users u ON c.userId = u.id ORDER BY c.createdAt DESC LIMIT ? OFFSET ?`, [take, skip]
    );
    const customers = customersRaw.map((c: any) => ({ ...c, user: { mobile: c.mobile, email: c.email, status: c.status, createdAt: c.userCreatedAt }, _count: { bookings: c.bookingsCount } }));
    sendSuccess(res, customers, 'Customers', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};
