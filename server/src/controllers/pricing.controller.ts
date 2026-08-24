import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { createAuditLog } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';

export const getPricingRules = async (_req: Request, res: Response): Promise<void> => {
  const [rulesRaw]: any = await pool.execute(`
    SELECT pr.*, vt.name as vehicleTypeName
    FROM pricing_rules pr
    LEFT JOIN vehicle_types vt ON pr.vehicleTypeId = vt.id
    ORDER BY vt.name ASC, pr.tripType ASC
  `);
  const rules = rulesRaw.map((r: any) => ({ ...r, vehicleType: r.vehicleTypeName ? { name: r.vehicleTypeName } : null }));
  sendSuccess(res, rules);
};

export const createPricingRule = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  const id = uuidv4();
  await pool.execute(
    `INSERT INTO pricing_rules (id, vehicleTypeId, tripType, baseFare, perKmRate, perHourRate, driverAllowanceDay, nightChargeMultiplier, extraKmRate, airportSurcharge, statePermitCharge, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
    [
      id, data.vehicleTypeId, data.tripType, parseFloat(data.baseFare || '0'), parseFloat(data.perKmRate || '0'), parseFloat(data.perHourRate || '0'),
      parseFloat(data.driverAllowanceDay || '0'), parseFloat(data.nightChargeMultiplier || '1'), parseFloat(data.extraKmRate || '0'),
      parseFloat(data.airportSurcharge || '0'), parseFloat(data.statePermitCharge || '0')
    ]
  );
  const [[rule]]: any = await pool.execute('SELECT * FROM pricing_rules WHERE id = ?', [id]);
  const [[vehicleType]]: any = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [data.vehicleTypeId]);
  
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'PricingRule', entityId: id, description: `Pricing rule created for ${vehicleType.name} - ${data.tripType}`, ipAddress: req.ip });
  sendCreated(res, { ...rule, vehicleType }, 'Pricing rule created');
};

export const updatePricingRule = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const data = req.body;
  
  await pool.execute(
    `UPDATE pricing_rules SET baseFare = ?, perKmRate = ?, perHourRate = ?, driverAllowanceDay = ?, nightChargeMultiplier = ?, extraKmRate = ?, airportSurcharge = ?, statePermitCharge = ?, isActive = COALESCE(?, isActive), updatedAt = NOW() WHERE id = ?`,
    [
      parseFloat(data.baseFare || '0'), parseFloat(data.perKmRate || '0'), parseFloat(data.perHourRate || '0'), parseFloat(data.driverAllowanceDay || '0'),
      parseFloat(data.nightChargeMultiplier || '1'), parseFloat(data.extraKmRate || '0'), parseFloat(data.airportSurcharge || '0'), parseFloat(data.statePermitCharge || '0'),
      data.isActive !== undefined ? Boolean(data.isActive) : null, id
    ]
  );
  
  const [[rule]]: any = await pool.execute('SELECT * FROM pricing_rules WHERE id = ?', [id]);
  const [[vehicleType]]: any = await pool.execute('SELECT * FROM vehicle_types WHERE id = ?', [rule.vehicleTypeId]);
  
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'PricingRule', entityId: id, description: `Pricing rule updated` });
  sendSuccess(res, { ...rule, vehicleType }, 'Pricing rule updated');
};

export const getTaxConfigs = async (_req: Request, res: Response): Promise<void> => {
  const [configs]: any = await pool.execute('SELECT * FROM tax_configs ORDER BY name ASC');
  sendSuccess(res, configs);
};

export const createTaxConfig = async (req: Request, res: Response): Promise<void> => {
  const { name, cgstRate, sgstRate, igstRate, isActive, isDefault } = req.body;
  const id = uuidv4();
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (isDefault) await connection.execute('UPDATE tax_configs SET isDefault = false');
    await connection.execute(
      `INSERT INTO tax_configs (id, name, cgstRate, sgstRate, igstRate, isActive, isDefault, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, parseFloat(cgstRate || '0'), parseFloat(sgstRate || '0'), parseFloat(igstRate || '0'), Boolean(isActive), Boolean(isDefault)]
    );
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  
  const [[config]]: any = await pool.execute('SELECT * FROM tax_configs WHERE id = ?', [id]);
  sendCreated(res, config, 'Tax configuration created');
};

export const calculateFarePreview = async (req: Request, res: Response): Promise<void> => {
  const { calculateFare } = await import('../services/pricing.service');
  const fare = await calculateFare({
    vehicleTypeId: req.body.vehicleTypeId,
    tripType: req.body.tripType,
    estimatedDistance: req.body.estimatedDistance ? parseFloat(req.body.estimatedDistance) : undefined,
    estimatedDuration: req.body.estimatedDuration ? parseFloat(req.body.estimatedDuration) : undefined,
    isNightTrip: Boolean(req.body.isNightTrip),
    hasAirport: Boolean(req.body.hasAirport),
    hasStateCrossing: Boolean(req.body.hasStateCrossing),
    tollCharges: req.body.tollCharges ? parseFloat(req.body.tollCharges) : undefined,
    discount: req.body.discount ? parseFloat(req.body.discount) : undefined,
  });
  sendSuccess(res, fare);
};
