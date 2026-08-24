import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { createAuditLog } from '../utils/helpers';

export const getPricingRules = async (_req: Request, res: Response): Promise<void> => {
  const rules = await prisma.pricingRule.findMany({
    include: { vehicleType: true },
    orderBy: [{ vehicleType: { name: 'asc' } }, { tripType: 'asc' }],
  });
  sendSuccess(res, rules);
};

export const createPricingRule = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  const rule = await prisma.pricingRule.create({
    data: {
      vehicleTypeId: data.vehicleTypeId,
      tripType: data.tripType,
      baseFare: parseFloat(data.baseFare || '0'),
      perKmRate: parseFloat(data.perKmRate || '0'),
      perHourRate: parseFloat(data.perHourRate || '0'),
      driverAllowanceDay: parseFloat(data.driverAllowanceDay || '0'),
      nightChargeMultiplier: parseFloat(data.nightChargeMultiplier || '1'),
      extraKmRate: parseFloat(data.extraKmRate || '0'),
      airportSurcharge: parseFloat(data.airportSurcharge || '0'),
      statePermitCharge: parseFloat(data.statePermitCharge || '0'),
    },
    include: { vehicleType: true },
  });
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'PricingRule', entityId: rule.id, description: `Pricing rule created for ${rule.vehicleType.name} - ${data.tripType}`, ipAddress: req.ip });
  sendCreated(res, rule, 'Pricing rule created');
};

export const updatePricingRule = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const data = req.body;
  const rule = await prisma.pricingRule.update({
    where: { id },
    data: {
      baseFare: parseFloat(data.baseFare || '0'),
      perKmRate: parseFloat(data.perKmRate || '0'),
      perHourRate: parseFloat(data.perHourRate || '0'),
      driverAllowanceDay: parseFloat(data.driverAllowanceDay || '0'),
      nightChargeMultiplier: parseFloat(data.nightChargeMultiplier || '1'),
      extraKmRate: parseFloat(data.extraKmRate || '0'),
      airportSurcharge: parseFloat(data.airportSurcharge || '0'),
      statePermitCharge: parseFloat(data.statePermitCharge || '0'),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
    },
    include: { vehicleType: true },
  });
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'PricingRule', entityId: id, description: `Pricing rule updated` });
  sendSuccess(res, rule, 'Pricing rule updated');
};

export const getTaxConfigs = async (_req: Request, res: Response): Promise<void> => {
  const configs = await prisma.taxConfig.findMany({ orderBy: { name: 'asc' } });
  sendSuccess(res, configs);
};

export const createTaxConfig = async (req: Request, res: Response): Promise<void> => {
  const { name, cgstRate, sgstRate, igstRate, isActive, isDefault } = req.body;
  if (isDefault) await prisma.taxConfig.updateMany({ data: { isDefault: false } });
  const config = await prisma.taxConfig.create({
    data: { name, cgstRate: parseFloat(cgstRate || '0'), sgstRate: parseFloat(sgstRate || '0'), igstRate: parseFloat(igstRate || '0'), isActive: Boolean(isActive), isDefault: Boolean(isDefault) },
  });
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
