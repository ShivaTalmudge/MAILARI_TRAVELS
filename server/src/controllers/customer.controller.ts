import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { getPaginationParams, createAuditLog } from '../utils/helpers';
import { Role, UserStatus } from '../types';
import { RowDataPacket } from 'mysql2/promise';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status } = req.query as { search?: string; status?: string };

  try {
    let whereClause = 'WHERE u.role = "CUSTOMER"';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (u.mobile LIKE ? OR u.email LIKE ? OR c.fullName LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM users u LEFT JOIN customer_profiles c ON u.id = c.userId ${whereClause}`,
      params
    );

    params.push(take, skip);
    const [customersRaw]: any = await pool.execute(
      `SELECT u.id, u.email, u.mobile, u.status, u.lastLoginAt, u.createdAt,
              c.id as profileId, c.fullName, c.city, c.state,
              (SELECT COUNT(*) FROM bookings b WHERE b.customerId = c.id) as bookingsCount
       FROM users u
       LEFT JOIN customer_profiles c ON u.id = c.userId
       ${whereClause}
       ORDER BY u.createdAt DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const customers = customersRaw.map((row: any) => ({
      id: row.profileId || row.id,
      fullName: row.fullName || 'Unknown',
      totalBookings: row.bookingsCount || 0,
      user: {
        id: row.id,
        mobile: row.mobile,
        email: row.email,
        isActive: row.status === 'ACTIVE',
        createdAt: row.createdAt,
      }
    }));

    sendSuccess(res, customers, 'Customers fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'CUSTOMER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  try {
    const [users]: any = await pool.execute(
      `SELECT u.id, u.email, u.mobile, u.status, u.lastLoginAt, u.createdAt,
              c.id as profileId, c.fullName, c.address, c.city, c.state, c.pincode
       FROM users u
       LEFT JOIN customer_profiles c ON u.id = c.userId
       WHERE u.id = ?`,
      [id]
    );

    if (users.length === 0 || !users[0].profileId) {
      sendNotFound(res, 'Customer not found');
      return;
    }

    const user = users[0];

    const [bookings]: any = await pool.execute(
      `SELECT b.*, v.name as vehicleTypeName, d.fullName as driverName
       FROM bookings b
       LEFT JOIN vehicle_types v ON b.vehicleTypeId = v.id
       LEFT JOIN driver_profiles d ON b.driverId = d.id
       WHERE b.customerId = ?
       ORDER BY b.createdAt DESC LIMIT 10`,
      [user.profileId]
    );

    const response = {
      id: user.profileId || user.id,
      fullName: user.fullName || 'Unknown',
      address: user.address, city: user.city, state: user.state, pincode: user.pincode,
      user: {
        id: user.id, email: user.email, mobile: user.mobile, isActive: user.status === 'ACTIVE', lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
      },
      bookings: bookings.map((b: any) => ({
        ...b,
        vehicleType: b.vehicleTypeName ? { name: b.vehicleTypeName } : null,
        driver: b.driverName ? { fullName: b.driverName } : null
      }))
    };

    sendSuccess(res, response);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'CUSTOMER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  const { fullName, email, address, city, state, pincode } = req.body;

  try {
    const [users]: any = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (users.length === 0) { sendNotFound(res, 'Customer not found'); return; }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (email !== undefined) {
        await connection.execute('UPDATE users SET email = ? WHERE id = ?', [email || null, id]);
      }
      await connection.execute(
        'UPDATE customer_profiles SET fullName = ?, address = ?, city = ?, state = ?, pincode = ? WHERE userId = ?',
        [fullName, address || null, city || null, state || null, pincode || null, id]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'Customer', entityId: id, description: `Customer profile updated: ${fullName}` });
    sendSuccess(res, null, 'Customer updated successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateCustomerStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [users]: any = await pool.execute('SELECT id FROM users WHERE id = ? AND role = "CUSTOMER"', [id]);
    if (users.length === 0) { sendNotFound(res, 'Customer not found'); return; }

    await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Customer', entityId: id, description: `Customer status changed to ${status}`, ipAddress: req.ip });
    sendSuccess(res, null, `Customer ${status.toLowerCase()} successfully`);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  req.params.id = req.user!.userId;
  return getCustomerById(req, res);
};
