import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { getPaginationParams, createAuditLog } from '../utils/helpers';
import { VehicleStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getVehicles = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status, vehicleTypeId } = req.query as { search?: string; status?: string; vehicleTypeId?: string };

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND v.status = ?';
      params.push(status);
    }
    if (vehicleTypeId) {
      whereClause += ' AND v.vehicleTypeId = ?';
      params.push(vehicleTypeId);
    }
    if (search) {
      whereClause += ' AND (v.registrationNumber LIKE ? OR v.make LIKE ? OR v.model LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [[{ total }]]: any = await pool.execute(`SELECT COUNT(*) as total FROM vehicles v ${whereClause}`, params);

    params.push(take, skip);
    const [vehiclesRaw]: any = await pool.execute(
      `SELECT v.*, 
              vt.name as typeName, vt.seatingCapacity as typeSeating, vt.luggageCapacity as typeLuggage,
              dp.id as driverProfileId, dp.fullName as driverName,
              u.id as driverUserId, u.mobile as driverMobile
       FROM vehicles v
       LEFT JOIN vehicle_types vt ON v.vehicleTypeId = vt.id
       LEFT JOIN driver_profiles dp ON dp.assignedVehicleId = v.id
       LEFT JOIN users u ON dp.userId = u.id
       ${whereClause}
       ORDER BY v.createdAt DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const vehiclesMap = new Map<string, any>();
    for (const row of vehiclesRaw) {
      if (!vehiclesMap.has(row.id)) {
        vehiclesMap.set(row.id, {
          id: row.id, registrationNumber: row.registrationNumber, make: row.make, model: row.model, variant: row.variant, year: row.year,
          color: row.color, fuelType: row.fuelType, seatingCapacity: row.seatingCapacity, insuranceNumber: row.insuranceNumber,
          insuranceExpiry: row.insuranceExpiry, permitNumber: row.permitNumber, permitExpiry: row.permitExpiry, fitnessNumber: row.fitnessNumber,
          fitnessExpiry: row.fitnessExpiry, pucNumber: row.pucNumber, pucExpiry: row.pucExpiry, currentOdometer: row.currentOdometer, status: row.status,
          notes: row.notes, createdAt: row.createdAt, updatedAt: row.updatedAt,
          vehicleType: row.typeName ? { id: row.vehicleTypeId, name: row.typeName, seatingCapacity: row.typeSeating, luggageCapacity: row.typeLuggage } : null,
          assignedDrivers: []
        });
      }
      if (row.driverProfileId) {
        vehiclesMap.get(row.id).assignedDrivers.push({
          fullName: row.driverName, user: { id: row.driverUserId, mobile: row.driverMobile }
        });
      }
    }

    sendSuccess(res, Array.from(vehiclesMap.values()), 'Vehicles fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const createVehicle = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  const id = uuidv4();

  try {
    await pool.execute(
      `INSERT INTO vehicles (id, registrationNumber, vehicleTypeId, make, model, variant, year, color, fuelType, seatingCapacity,
         insuranceNumber, insuranceExpiry, permitNumber, permitExpiry, fitnessNumber, fitnessExpiry, pucNumber, pucExpiry, currentOdometer, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, data.registrationNumber, data.vehicleTypeId, data.make, data.model, data.variant || null, parseInt(data.year), data.color, data.fuelType, parseInt(data.seatingCapacity),
        data.insuranceNumber || null, data.insuranceExpiry ? new Date(data.insuranceExpiry) : null, data.permitNumber || null, data.permitExpiry ? new Date(data.permitExpiry) : null,
        data.fitnessNumber || null, data.fitnessExpiry ? new Date(data.fitnessExpiry) : null, data.pucNumber || null, data.pucExpiry ? new Date(data.pucExpiry) : null,
        parseInt(data.currentOdometer || '0'), data.notes || null
      ]
    );

    const [[vehicle]]: any = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    const [[vehicleType]]: any = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [data.vehicleTypeId]);

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Vehicle', entityId: id, description: `Vehicle created: ${data.registrationNumber}`, ipAddress: req.ip });
    sendCreated(res, { ...vehicle, vehicleType }, 'Vehicle added to fleet successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getVehicleById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [[vehicle]]: any = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

    const [[vehicleType]]: any = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [vehicle.vehicleTypeId]);
    const [documents]: any = await pool.execute('SELECT * FROM vehicle_documents WHERE vehicleId = ? ORDER BY expiryDate ASC', [id]);
    
    const [assignedDriversRaw]: any = await pool.execute(
      `SELECT dp.*, u.mobile, u.email FROM driver_profiles dp JOIN users u ON dp.userId = u.id WHERE dp.assignedVehicleId = ?`, [id]
    );
    const assignedDrivers = assignedDriversRaw.map((d: any) => ({ ...d, user: { id: d.userId, mobile: d.mobile, email: d.email } }));

    const [bookingsRaw]: any = await pool.execute(
      `SELECT b.*, c.fullName as customerName FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id WHERE b.vehicleId = ? ORDER BY b.createdAt DESC LIMIT 10`, [id]
    );
    const bookings = bookingsRaw.map((b: any) => ({ ...b, customer: b.customerName ? { fullName: b.customerName } : null }));

    sendSuccess(res, { ...vehicle, vehicleType, documents, assignedDrivers, bookings });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const data = req.body;
  
  try {
    const [[vehicle]]: any = await pool.execute('SELECT id, registrationNumber FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

    await pool.execute(
      `UPDATE vehicles SET make = ?, model = ?, variant = ?, year = COALESCE(?, year), color = ?, fuelType = ?, seatingCapacity = COALESCE(?, seatingCapacity),
         insuranceNumber = ?, insuranceExpiry = ?, permitNumber = ?, permitExpiry = ?, fitnessNumber = ?, fitnessExpiry = ?, pucNumber = ?, pucExpiry = ?,
         currentOdometer = COALESCE(?, currentOdometer), notes = ?, updatedAt = NOW() WHERE id = ?`,
      [
        data.make, data.model, data.variant, data.year ? parseInt(data.year) : null, data.color, data.fuelType, data.seatingCapacity ? parseInt(data.seatingCapacity) : null,
        data.insuranceNumber, data.insuranceExpiry ? new Date(data.insuranceExpiry) : null, data.permitNumber, data.permitExpiry ? new Date(data.permitExpiry) : null,
        data.fitnessNumber, data.fitnessExpiry ? new Date(data.fitnessExpiry) : null, data.pucNumber, data.pucExpiry ? new Date(data.pucExpiry) : null,
        data.currentOdometer ? parseInt(data.currentOdometer) : null, data.notes, id
      ]
    );

    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'Vehicle', entityId: id, description: `Vehicle updated: ${vehicle.registrationNumber}` });
    sendSuccess(res, null, 'Vehicle updated successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updateVehicleStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const [[vehicle]]: any = await pool.execute('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

    await pool.execute('UPDATE vehicles SET status = ? WHERE id = ?', [status, id]);
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Vehicle', entityId: id, description: `Vehicle status changed to ${status}`, ipAddress: req.ip });
    sendSuccess(res, null, `Vehicle status updated to ${status}`);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getExpiryAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [vehicles]: any = await pool.execute(
      `SELECT id, registrationNumber, make, model, insuranceExpiry, pucExpiry, permitExpiry, fitnessExpiry
       FROM vehicles
       WHERE status != 'INACTIVE' AND (insuranceExpiry <= ? OR pucExpiry <= ? OR permitExpiry <= ? OR fitnessExpiry <= ?)`,
      [thirtyDaysFromNow, thirtyDaysFromNow, thirtyDaysFromNow, thirtyDaysFromNow]
    );
    sendSuccess(res, vehicles, 'Expiry alerts fetched');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getAvailableVehicles = async (req: Request, res: Response): Promise<void> => {
  const { vehicleTypeId } = req.query as { vehicleTypeId?: string };
  try {
    let query = 'SELECT v.*, vt.name as typeName FROM vehicles v LEFT JOIN vehicle_types vt ON v.vehicleTypeId = vt.id WHERE v.status = "AVAILABLE"';
    const params: any[] = [];
    if (vehicleTypeId) {
      query += ' AND v.vehicleTypeId = ?';
      params.push(vehicleTypeId);
    }
    query += ' ORDER BY v.registrationNumber ASC';
    
    const [vehiclesRaw]: any = await pool.execute(query, params);
    const vehicles = vehiclesRaw.map((v: any) => ({ ...v, vehicleType: v.typeName ? { name: v.typeName } : null }));
    sendSuccess(res, vehicles);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const addVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { documentType, documentNumber, issueDate, expiryDate, fileUrl, notes } = req.body;
  const docId = uuidv4();
  try {
    const [[vehicle]]: any = await pool.execute('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

    await pool.execute(
      `INSERT INTO vehicle_documents (id, vehicleId, documentType, documentNumber, issueDate, expiryDate, fileUrl, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [docId, id, documentType, documentNumber || null, issueDate ? new Date(issueDate) : null, expiryDate ? new Date(expiryDate) : null, fileUrl || null, notes || null]
    );
    sendCreated(res, { id: docId }, 'Document added successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
