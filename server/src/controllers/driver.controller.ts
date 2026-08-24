import { Request, Response } from 'express';
import { pool } from '../config/db';
import { hashPassword } from '../utils/password';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { getPaginationParams, createAuditLog } from '../utils/helpers';
import { Role, DriverStatus, UserStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getDrivers = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status } = req.query as { search?: string; status?: string };

  try {
    let whereClause = 'WHERE u.role = "DRIVER"';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }
    if (search) {
      whereClause += ' AND (u.mobile LIKE ? OR u.email LIKE ? OR dp.fullName LIKE ? OR dp.licenceNumber LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM users u LEFT JOIN driver_profiles dp ON u.id = dp.userId ${whereClause}`,
      params
    );

    params.push(take, skip);
    const [driversRaw]: any = await pool.execute(
      `SELECT u.id, u.email, u.mobile, u.status, u.lastLoginAt, u.createdAt,
              dp.id as profileId, dp.fullName, dp.licenceNumber, dp.status as driverStatus, dp.city, dp.state, dp.profilePhoto, dp.licenceExpiry,
              v.registrationNumber as vehicleReg, v.make as vehicleMake, v.model as vehicleModel
       FROM users u
       LEFT JOIN driver_profiles dp ON u.id = dp.userId
       LEFT JOIN vehicles v ON dp.assignedVehicleId = v.id
       ${whereClause}
       ORDER BY u.createdAt DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const drivers = driversRaw.map((row: any) => ({
      id: row.id, email: row.email, mobile: row.mobile, status: row.status, lastLoginAt: row.lastLoginAt, createdAt: row.createdAt,
      driverProfile: row.profileId ? {
        id: row.profileId, fullName: row.fullName, licenceNumber: row.licenceNumber, status: row.driverStatus, city: row.city, state: row.state,
        profilePhoto: row.profilePhoto, licenceExpiry: row.licenceExpiry,
        assignedVehicle: row.vehicleReg ? { registrationNumber: row.vehicleReg, make: row.vehicleMake, model: row.vehicleModel } : null
      } : null
    }));

    sendSuccess(res, drivers, 'Drivers fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const createDriver = async (req: Request, res: Response): Promise<void> => {
  const { fullName, mobile, email, password, licenceNumber, licenceExpiry, dateOfBirth, address, city, state, pincode, emergencyContact, emergencyName, joiningDate } = req.body;

  try {
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const profileId = uuidv4();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO users (id, mobile, email, passwordHash, role, status, authProvider, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'LOCAL', false, NOW(), NOW())`,
        [userId, mobile, email || null, passwordHash, Role.DRIVER, UserStatus.ACTIVE]
      );
      await connection.execute(
        `INSERT INTO driver_profiles (id, userId, fullName, licenceNumber, licenceExpiry, dateOfBirth, address, city, state, pincode, emergencyContact, emergencyName, joiningDate, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [profileId, userId, fullName, licenceNumber, new Date(licenceExpiry), dateOfBirth ? new Date(dateOfBirth) : null, address || null, city || null, state || null, pincode || null, emergencyContact || null, emergencyName || null, joiningDate ? new Date(joiningDate) : new Date(), DriverStatus.AVAILABLE]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Driver', entityId: userId, description: `Driver created: ${fullName}`, ipAddress: req.ip });
    sendCreated(res, { id: userId, fullName, mobile }, 'Driver account created successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getDriverById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'DRIVER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  try {
    const [users]: any = await pool.execute(
      `SELECT u.id, u.email, u.mobile, u.status, u.lastLoginAt, u.createdAt,
              dp.id as profileId, dp.assignedVehicleId
       FROM users u LEFT JOIN driver_profiles dp ON u.id = dp.userId WHERE u.id = ?`,
      [id]
    );

    if (users.length === 0 || !users[0].profileId) { sendNotFound(res, 'Driver not found'); return; }
    const user = users[0];

    const response: any = {
      id: user.id, email: user.email, mobile: user.mobile, status: user.status, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
      driverProfile: { assignedVehicle: null, bookings: [] }
    };

    if (user.assignedVehicleId) {
      const [vehicles]: any = await pool.execute(
        `SELECT v.*, vt.name as typeName FROM vehicles v LEFT JOIN vehicle_types vt ON v.vehicleTypeId = vt.id WHERE v.id = ?`, [user.assignedVehicleId]
      );
      if (vehicles.length > 0) {
        const [docs]: any = await pool.execute('SELECT * FROM vehicle_documents WHERE vehicleId = ?', [user.assignedVehicleId]);
        response.driverProfile.assignedVehicle = { ...vehicles[0], vehicleType: vehicles[0].typeName ? { name: vehicles[0].typeName } : null, documents: docs };
      }
    }

    const [bookingsRaw]: any = await pool.execute(
      `SELECT b.*, c.fullName as customerName, v.registrationNumber, v.make, v.model
       FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN vehicles v ON b.vehicleId = v.id
       WHERE b.driverId = ? ORDER BY b.createdAt DESC LIMIT 20`, [user.profileId]
    );

    response.driverProfile.bookings = bookingsRaw.map((b: any) => ({
      ...b, customer: b.customerName ? { fullName: b.customerName } : null,
      vehicle: b.registrationNumber ? { registrationNumber: b.registrationNumber, make: b.make, model: b.model } : null
    }));

    sendSuccess(res, response);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'DRIVER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  const { fullName, email, licenceNumber, licenceExpiry, dateOfBirth, address, city, state, pincode, emergencyContact, emergencyName } = req.body;

  try {
    const [[user]]: any = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) { sendNotFound(res, 'Driver not found'); return; }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (email !== undefined) {
        await connection.execute('UPDATE users SET email = ? WHERE id = ?', [email || null, id]);
      }
      await connection.execute(
        `UPDATE driver_profiles SET fullName = ?, licenceNumber = ?, licenceExpiry = COALESCE(?, licenceExpiry), dateOfBirth = COALESCE(?, dateOfBirth),
         address = ?, city = ?, state = ?, pincode = ?, emergencyContact = ?, emergencyName = ?, updatedAt = NOW() WHERE userId = ?`,
        [fullName, licenceNumber, licenceExpiry ? new Date(licenceExpiry) : null, dateOfBirth ? new Date(dateOfBirth) : null, address || null, city || null, state || null, pincode || null, emergencyContact || null, emergencyName || null, id]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'Driver', entityId: id, description: `Driver updated: ${fullName}` });
    sendSuccess(res, null, 'Driver updated successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateDriverStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [[user]]: any = await pool.execute('SELECT id FROM users WHERE id = ? AND role = "DRIVER"', [id]);
    if (!user) { sendNotFound(res, 'Driver not found'); return; }

    let userStatus = null;
    if (status === 'SUSPENDED') userStatus = UserStatus.SUSPENDED;
    if (status === 'ACTIVE') userStatus = UserStatus.ACTIVE;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (userStatus) {
        await connection.execute('UPDATE users SET status = ? WHERE id = ?', [userStatus, id]);
      }
      await connection.execute('UPDATE driver_profiles SET status = ? WHERE userId = ?', [status, id]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Driver', entityId: id, description: `Driver status changed to ${status}`, ipAddress: req.ip });
    sendSuccess(res, null, `Driver status updated to ${status}`);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const assignVehicleToDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { vehicleId } = req.body;

  try {
    const [[driver]]: any = await pool.execute('SELECT assignedVehicleId FROM driver_profiles WHERE userId = ?', [id]);
    if (!driver) { sendNotFound(res, 'Driver not found'); return; }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (vehicleId) {
        const [[vehicle]]: any = await connection.execute('SELECT status FROM vehicles WHERE id = ?', [vehicleId]);
        if (!vehicle) {
          await connection.rollback(); connection.release();
          sendNotFound(res, 'Vehicle not found'); return;
        }
        if (vehicle.status === 'MAINTENANCE' || vehicle.status === 'INACTIVE') {
          await connection.rollback(); connection.release();
          res.status(400).json({ success: false, message: 'Vehicle is not available for assignment' }); return;
        }
        await connection.execute('UPDATE vehicles SET status = "ASSIGNED" WHERE id = ?', [vehicleId]);
      }

      if (driver.assignedVehicleId && driver.assignedVehicleId !== vehicleId) {
        await connection.execute('UPDATE vehicles SET status = "AVAILABLE" WHERE id = ?', [driver.assignedVehicleId]);
      }

      await connection.execute('UPDATE driver_profiles SET assignedVehicleId = ? WHERE userId = ?', [vehicleId || null, id]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_VEHICLE', entity: 'Driver', entityId: id, description: `Vehicle ${vehicleId} assigned to driver`, ipAddress: req.ip });
    sendSuccess(res, null, 'Vehicle assigned to driver successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getAvailableDrivers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [driversRaw]: any = await pool.execute(
      `SELECT dp.id, dp.fullName, dp.status, u.id as userId, u.mobile, u.email, u.status as userStatus,
              v.id as vehicleId, v.registrationNumber, v.make, v.model, vt.name as vehicleTypeName
       FROM driver_profiles dp
       JOIN users u ON dp.userId = u.id
       LEFT JOIN vehicles v ON dp.assignedVehicleId = v.id
       LEFT JOIN vehicle_types vt ON v.vehicleTypeId = vt.id
       WHERE dp.status = "AVAILABLE"
       ORDER BY dp.fullName ASC`
    );

    const drivers = driversRaw.map((d: any) => ({
      id: d.id, fullName: d.fullName, status: d.status,
      user: { id: d.userId, mobile: d.mobile, email: d.email, status: d.userStatus },
      assignedVehicle: d.vehicleId ? { id: d.vehicleId, registrationNumber: d.registrationNumber, make: d.make, model: d.model, vehicleType: d.vehicleTypeName ? { name: d.vehicleTypeName } : null } : null
    }));

    sendSuccess(res, drivers);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
