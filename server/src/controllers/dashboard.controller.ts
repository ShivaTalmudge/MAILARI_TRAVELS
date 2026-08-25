import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { Role, BookingStatus } from '../types';

export const getAdminDashboard = async (_req: Request, res: Response): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const [
      [[{ todayBookings }]],
      [[{ upcomingTrips }]],
      [[{ activeTrips }]],
      [[{ completedToday }]],
      [[{ cancelledToday }]],
      [[{ totalCustomers }]],
      [[{ totalDrivers }]],
      [[{ totalVehicles }]],
      [[{ availableVehicles }]],
      [[{ driversOnTrip }]],
      [[{ pendingPaymentsAmount }]],
      [monthlyRevenueRaw],
      [bookingsByStatusRaw],
      [recentBookingsRaw],
      [expiringDocumentsRaw]
    ]: any = await Promise.all([
      pool.execute('SELECT COUNT(*) as todayBookings FROM bookings WHERE pickupDate >= ? AND pickupDate < ?', [today, tomorrow]),
      pool.execute('SELECT COUNT(*) as upcomingTrips FROM bookings WHERE pickupDate >= ? AND status IN (?, ?)', [tomorrow, BookingStatus.CONFIRMED, BookingStatus.DRIVER_ASSIGNED]),
      pool.execute('SELECT COUNT(*) as activeTrips FROM bookings WHERE status IN (?, ?, ?)', [BookingStatus.TRIP_STARTED, BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.ARRIVED]),
      pool.execute('SELECT COUNT(*) as completedToday FROM bookings WHERE status = ? AND updatedAt >= ?', [BookingStatus.TRIP_COMPLETED, today]),
      pool.execute('SELECT COUNT(*) as cancelledToday FROM bookings WHERE status = ? AND updatedAt >= ?', [BookingStatus.CANCELLED, today]),
      pool.execute('SELECT COUNT(*) as totalCustomers FROM users WHERE role = ?', [Role.CUSTOMER]),
      pool.execute('SELECT COUNT(*) as totalDrivers FROM users WHERE role = ?', [Role.DRIVER]),
      pool.execute('SELECT COUNT(*) as totalVehicles FROM vehicles WHERE status != "INACTIVE"'),
      pool.execute('SELECT COUNT(*) as availableVehicles FROM vehicles WHERE status = "AVAILABLE"'),
      pool.execute('SELECT COUNT(*) as driversOnTrip FROM driver_profiles WHERE status = "ON_TRIP"'),
      pool.execute('SELECT SUM(totalAmount) as pendingPaymentsAmount FROM bookings WHERE paymentStatus = "PENDING" AND status = ?', [BookingStatus.TRIP_COMPLETED]),
      pool.execute(`SELECT DATE(paymentDate) as paymentDate, SUM(amount) as amount FROM payments WHERE status = 'PAID' AND paymentDate >= DATE_SUB(NOW(), INTERVAL 180 DAY) GROUP BY DATE(paymentDate) ORDER BY paymentDate ASC`),
      pool.execute('SELECT status, COUNT(id) as _count FROM bookings GROUP BY status'),
      pool.execute(`SELECT b.*, c.fullName as customerName, vt.name as vehicleTypeName FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id ORDER BY b.createdAt DESC LIMIT 10`),
      pool.execute(`SELECT id, registrationNumber, insuranceExpiry, pucExpiry, permitExpiry, fitnessExpiry FROM vehicles WHERE (insuranceExpiry < DATE_ADD(NOW(), INTERVAL 30 DAY) OR pucExpiry < DATE_ADD(NOW(), INTERVAL 30 DAY) OR permitExpiry < DATE_ADD(NOW(), INTERVAL 30 DAY) OR fitnessExpiry < DATE_ADD(NOW(), INTERVAL 30 DAY)) AND status != 'INACTIVE'`)
    ]);

    const recentBookings = recentBookingsRaw.map((b: any) => ({
      ...b, customer: b.customerName ? { fullName: b.customerName } : null, vehicleType: b.vehicleTypeName ? { name: b.vehicleTypeName } : null
    }));
    
    const bookingsByStatus = bookingsByStatusRaw.map((b: any) => ({ status: b.status, _count: { id: b._count } }));
    const monthlyRevenue = monthlyRevenueRaw.map((r: any) => ({ paymentDate: r.paymentDate, _sum: { amount: r.amount } }));
    const expiringDocuments = expiringDocumentsRaw;

    sendSuccess(res, {
      stats: {
        todayBookings, upcomingTrips, activeTrips, completedToday, cancelledToday,
        totalCustomers, totalDrivers, totalVehicles, availableVehicles, driversOnTrip,
        pendingPaymentsAmount: pendingPaymentsAmount || 0,
      },
      charts: { monthlyRevenue, bookingsByStatus },
      recentBookings,
      expiringDocuments
    });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getCustomerDashboard = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [userId]);
    if (!profile) { sendError(res, 'Profile not found', 404); return; }

    const [
      [activeBookingRaw],
      [upcomingBookingRaw],
      [recentBookingsRaw],
      [[{ totalBookings }]],
      [[{ pendingPaymentAmount }]],
      [notifications]
    ]: any = await Promise.all([
      pool.execute(`SELECT b.*, d.fullName as driverName, u.mobile as driverMobile, v.registrationNumber, v.make, v.model FROM bookings b LEFT JOIN driver_profiles d ON b.driverId = d.id LEFT JOIN users u ON d.userId = u.id LEFT JOIN vehicles v ON b.vehicleId = v.id WHERE b.customerId = ? AND b.status IN (?, ?, ?) ORDER BY b.createdAt DESC LIMIT 1`, [profile.id, BookingStatus.TRIP_STARTED, BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.ARRIVED]),
      pool.execute(`SELECT b.*, d.fullName as driverName, v.registrationNumber, v.make, v.model, vt.name as vehicleTypeName FROM bookings b LEFT JOIN driver_profiles d ON b.driverId = d.id LEFT JOIN vehicles v ON b.vehicleId = v.id LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id WHERE b.customerId = ? AND b.pickupDate >= NOW() AND b.status IN (?, ?) ORDER BY b.pickupDate ASC LIMIT 1`, [profile.id, BookingStatus.CONFIRMED, BookingStatus.DRIVER_ASSIGNED]),
      pool.execute(`SELECT b.*, vt.name as vehicleTypeName FROM bookings b LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id WHERE b.customerId = ? ORDER BY b.createdAt DESC LIMIT 5`, [profile.id]),
      pool.execute(`SELECT COUNT(*) as totalBookings FROM bookings WHERE customerId = ?`, [profile.id]),
      pool.execute(`SELECT SUM(totalAmount) as pendingPaymentAmount FROM bookings WHERE customerId = ? AND paymentStatus IN ('PENDING', 'PARTIALLY_PAID')`, [profile.id]),
      pool.execute(`SELECT * FROM notifications WHERE userId = ? AND isRead = false ORDER BY createdAt DESC LIMIT 5`, [userId])
    ]);

    const formatBooking = (b: any) => b ? ({ ...b, driver: b.driverName ? { fullName: b.driverName, user: b.driverMobile ? { mobile: b.driverMobile } : null } : null, vehicle: b.registrationNumber ? { registrationNumber: b.registrationNumber, make: b.make, model: b.model } : null, vehicleType: b.vehicleTypeName ? { name: b.vehicleTypeName } : null }) : null;

    sendSuccess(res, { 
      activeBooking: activeBookingRaw.length > 0 ? formatBooking(activeBookingRaw[0]) : null, 
      upcomingBooking: upcomingBookingRaw.length > 0 ? formatBooking(upcomingBookingRaw[0]) : null, 
      recentBookings: recentBookingsRaw.map(formatBooking), 
      totalBookings, pendingPaymentAmount: pendingPaymentAmount || 0, notifications 
    });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getDriverDashboard = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const [[driverRaw]]: any = await pool.execute(`SELECT dp.*, v.registrationNumber, v.make, v.model, vt.name as vehicleTypeName FROM driver_profiles dp LEFT JOIN vehicles v ON dp.assignedVehicleId = v.id LEFT JOIN vehicle_types vt ON v.vehicleTypeId = vt.id WHERE dp.userId = ?`, [userId]);
    if (!driverRaw) { sendError(res, 'Driver profile not found', 404); return; }

    const driver = { ...driverRaw, assignedVehicle: driverRaw.registrationNumber ? { registrationNumber: driverRaw.registrationNumber, make: driverRaw.make, model: driverRaw.model, vehicleType: driverRaw.vehicleTypeName ? { name: driverRaw.vehicleTypeName } : null } : null };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      [[{ todayTrips }]],
      [activeTripRaw],
      [upcomingTripsRaw],
      [[{ completedTrips }]],
      [[{ totalEarnings }]],
      [notifications]
    ]: any = await Promise.all([
      pool.execute(`SELECT COUNT(*) as todayTrips FROM bookings WHERE driverId = ? AND pickupDate >= ? AND pickupDate < ?`, [driver.id, today, tomorrow]),
      pool.execute(`SELECT b.*, c.fullName as customerName, u.mobile as customerMobile, v.registrationNumber, v.make, v.model FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN users u ON c.userId = u.id LEFT JOIN vehicles v ON b.vehicleId = v.id WHERE b.driverId = ? AND b.status IN (?, ?, ?, ?) ORDER BY b.createdAt DESC LIMIT 1`, [driver.id, BookingStatus.TRIP_STARTED, BookingStatus.DRIVER_ON_THE_WAY, BookingStatus.ARRIVED, BookingStatus.DRIVER_ACCEPTED]),
      pool.execute(`SELECT b.*, c.fullName as customerName, vt.name as vehicleTypeName FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id WHERE b.driverId = ? AND b.pickupDate >= NOW() AND b.status IN (?, ?) ORDER BY b.pickupDate ASC LIMIT 5`, [driver.id, BookingStatus.DRIVER_ASSIGNED, BookingStatus.CONFIRMED]),
      pool.execute(`SELECT COUNT(*) as completedTrips FROM bookings WHERE driverId = ? AND status = ?`, [driver.id, BookingStatus.TRIP_COMPLETED]),
      pool.execute(`SELECT SUM(totalAmount) as totalEarnings FROM bookings WHERE driverId = ? AND status = ?`, [driver.id, BookingStatus.TRIP_COMPLETED]),
      pool.execute(`SELECT * FROM notifications WHERE userId = ? AND isRead = false ORDER BY createdAt DESC LIMIT 5`, [userId])
    ]);

    const formatActive = (b: any) => b ? ({ ...b, customer: b.customerName ? { fullName: b.customerName, user: b.customerMobile ? { mobile: b.customerMobile } : null } : null, vehicle: b.registrationNumber ? { registrationNumber: b.registrationNumber, make: b.make, model: b.model } : null }) : null;
    const formatUpcoming = (b: any) => b ? ({ ...b, customer: b.customerName ? { fullName: b.customerName } : null, vehicleType: b.vehicleTypeName ? { name: b.vehicleTypeName } : null }) : null;

    sendSuccess(res, { 
      driver, todayTrips, 
      activeTrip: activeTripRaw.length > 0 ? formatActive(activeTripRaw[0]) : null, 
      upcomingTrips: upcomingTripsRaw.map(formatUpcoming), 
      completedTrips, totalEarnings: totalEarnings || 0, notifications 
    });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
