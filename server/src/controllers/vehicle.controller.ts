import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { getPaginationParams, createAuditLog } from '../utils/helpers';
import { VehicleStatus } from '@prisma/client';

export const getVehicles = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status, vehicleTypeId } = req.query as { search?: string; status?: string; vehicleTypeId?: string };

  const where = {
    ...(status ? { status: status as VehicleStatus } : {}),
    ...(vehicleTypeId ? { vehicleTypeId } : {}),
    ...(search ? {
      OR: [
        { registrationNumber: { contains: search } },
        { make: { contains: search } },
        { model: { contains: search } },
      ],
    } : {}),
  };

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicleType: true,
        assignedDrivers: { select: { fullName: true, user: { select: { id: true, mobile: true } } } },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  sendSuccess(res, vehicles, 'Vehicles fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const createVehicle = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  const vehicle = await prisma.vehicle.create({
    data: {
      registrationNumber: data.registrationNumber,
      vehicleTypeId: data.vehicleTypeId,
      make: data.make,
      model: data.model,
      variant: data.variant,
      year: parseInt(data.year),
      color: data.color,
      fuelType: data.fuelType,
      seatingCapacity: parseInt(data.seatingCapacity),
      insuranceNumber: data.insuranceNumber,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
      permitNumber: data.permitNumber,
      permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
      fitnessNumber: data.fitnessNumber,
      fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : null,
      pucNumber: data.pucNumber,
      pucExpiry: data.pucExpiry ? new Date(data.pucExpiry) : null,
      currentOdometer: parseInt(data.currentOdometer || '0'),
      notes: data.notes,
    },
    include: { vehicleType: true },
  });

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Vehicle', entityId: vehicle.id, description: `Vehicle created: ${vehicle.registrationNumber}`, ipAddress: req.ip });
  sendCreated(res, vehicle, 'Vehicle added to fleet successfully');
};

export const getVehicleById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      vehicleType: true,
      documents: { orderBy: { expiryDate: 'asc' } },
      assignedDrivers: { include: { user: { select: { id: true, mobile: true, email: true } } } },
      bookings: { orderBy: { createdAt: 'desc' }, take: 10, include: { customer: { select: { fullName: true } } } },
    },
  });
  if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }
  sendSuccess(res, vehicle);
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const data = req.body;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      make: data.make, model: data.model, variant: data.variant,
      year: data.year ? parseInt(data.year) : undefined,
      color: data.color, fuelType: data.fuelType,
      seatingCapacity: data.seatingCapacity ? parseInt(data.seatingCapacity) : undefined,
      insuranceNumber: data.insuranceNumber,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
      permitNumber: data.permitNumber,
      permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : undefined,
      fitnessNumber: data.fitnessNumber,
      fitnessExpiry: data.fitnessExpiry ? new Date(data.fitnessExpiry) : undefined,
      pucNumber: data.pucNumber,
      pucExpiry: data.pucExpiry ? new Date(data.pucExpiry) : undefined,
      currentOdometer: data.currentOdometer ? parseInt(data.currentOdometer) : undefined,
      notes: data.notes,
    },
    include: { vehicleType: true },
  });

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'Vehicle', entityId: id, description: `Vehicle updated: ${vehicle.registrationNumber}` });
  sendSuccess(res, updated, 'Vehicle updated successfully');
};

export const updateVehicleStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

  await prisma.vehicle.update({ where: { id }, data: { status: status as VehicleStatus } });
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Vehicle', entityId: id, description: `Vehicle status changed to ${status}`, ipAddress: req.ip });
  sendSuccess(res, null, `Vehicle status updated to ${status}`);
};

export const getExpiryAlerts = async (_req: Request, res: Response): Promise<void> => {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: { not: VehicleStatus.INACTIVE },
      OR: [
        { insuranceExpiry: { lte: thirtyDaysFromNow } },
        { pucExpiry: { lte: thirtyDaysFromNow } },
        { permitExpiry: { lte: thirtyDaysFromNow } },
        { fitnessExpiry: { lte: thirtyDaysFromNow } },
      ],
    },
    select: {
      id: true, registrationNumber: true, make: true, model: true,
      insuranceExpiry: true, pucExpiry: true, permitExpiry: true, fitnessExpiry: true,
    },
  });

  sendSuccess(res, vehicles, 'Expiry alerts fetched');
};

export const getAvailableVehicles = async (req: Request, res: Response): Promise<void> => {
  const { vehicleTypeId } = req.query as { vehicleTypeId?: string };

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: VehicleStatus.AVAILABLE,
      ...(vehicleTypeId ? { vehicleTypeId } : {}),
    },
    include: { vehicleType: true },
    orderBy: { registrationNumber: 'asc' },
  });
  sendSuccess(res, vehicles);
};

export const addVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { documentType, documentNumber, issueDate, expiryDate, fileUrl, notes } = req.body;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }

  const doc = await prisma.vehicleDocument.create({
    data: {
      vehicleId: id, documentType, documentNumber,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      fileUrl, notes,
    },
  });

  sendCreated(res, doc, 'Document added successfully');
};
