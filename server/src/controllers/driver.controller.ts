import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { getPaginationParams, createAuditLog } from '../utils/helpers';
import { Role, DriverStatus, UserStatus } from '@prisma/client';

export const getDrivers = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status } = req.query as { search?: string; status?: string };

  const where = {
    role: Role.DRIVER,
    ...(status ? { status: status as UserStatus } : {}),
    ...(search ? {
      OR: [
        { mobile: { contains: search } },
        { email: { contains: search } },
        { driverProfile: { fullName: { contains: search } } },
        { driverProfile: { licenceNumber: { contains: search } } },
      ],
    } : {}),
  };

  const [drivers, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, mobile: true, status: true, lastLoginAt: true, createdAt: true,
        driverProfile: {
          select: {
            id: true, fullName: true, licenceNumber: true, status: true, city: true, state: true,
            profilePhoto: true, licenceExpiry: true,
            assignedVehicle: { select: { registrationNumber: true, make: true, model: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, drivers, 'Drivers fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const createDriver = async (req: Request, res: Response): Promise<void> => {
  const { fullName, mobile, email, password, licenceNumber, licenceExpiry, dateOfBirth, address, city, state, pincode, emergencyContact, emergencyName, joiningDate } = req.body;

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      mobile,
      email: email || null,
      passwordHash,
      role: Role.DRIVER,
      driverProfile: {
        create: {
          fullName,
          licenceNumber,
          licenceExpiry: new Date(licenceExpiry),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          address, city, state, pincode,
          emergencyContact, emergencyName,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        },
      },
    },
    include: { driverProfile: true },
  });

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Driver', entityId: user.id, description: `Driver created: ${fullName}`, ipAddress: req.ip });
  sendCreated(res, { id: user.id, fullName, mobile }, 'Driver account created successfully');
};

export const getDriverById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'DRIVER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, mobile: true, status: true, lastLoginAt: true, createdAt: true,
      driverProfile: {
        include: {
          assignedVehicle: { include: { vehicleType: true, documents: true } },
          bookings: {
            orderBy: { createdAt: 'desc' }, take: 20,
            include: { customer: { select: { fullName: true } }, vehicle: { select: { registrationNumber: true, make: true, model: true } } },
          },
        },
      },
    },
  });

  if (!user || !user.driverProfile) { sendNotFound(res, 'Driver not found'); return; }
  sendSuccess(res, user);
};

export const updateDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'DRIVER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  const { fullName, email, licenceNumber, licenceExpiry, dateOfBirth, address, city, state, pincode, emergencyContact, emergencyName } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { sendNotFound(res, 'Driver not found'); return; }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { email: email || null } }),
    prisma.driverProfile.update({
      where: { userId: id },
      data: { fullName, licenceNumber, licenceExpiry: licenceExpiry ? new Date(licenceExpiry) : undefined, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined, address, city, state, pincode, emergencyContact, emergencyName },
    }),
  ]);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'Driver', entityId: id, description: `Driver updated: ${fullName}` });
  sendSuccess(res, null, 'Driver updated successfully');
};

export const updateDriverStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await prisma.user.findFirst({ where: { id, role: Role.DRIVER } });
  if (!user) { sendNotFound(res, 'Driver not found'); return; }

  const updates: { userStatus?: UserStatus; driverStatus?: DriverStatus } = {};
  if (status === 'SUSPENDED') updates.userStatus = UserStatus.SUSPENDED;
  if (status === 'ACTIVE') updates.userStatus = UserStatus.ACTIVE;

  await prisma.$transaction([
    ...(updates.userStatus ? [prisma.user.update({ where: { id }, data: { status: updates.userStatus } })] : []),
    prisma.driverProfile.update({ where: { userId: id }, data: { status: status as DriverStatus } }),
  ]);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Driver', entityId: id, description: `Driver status changed to ${status}`, ipAddress: req.ip });
  sendSuccess(res, null, `Driver status updated to ${status}`);
};

export const assignVehicleToDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { vehicleId } = req.body;

  const driver = await prisma.driverProfile.findUnique({ where: { userId: id } });
  if (!driver) { sendNotFound(res, 'Driver not found'); return; }

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) { sendNotFound(res, 'Vehicle not found'); return; }
    if (vehicle.status === 'MAINTENANCE' || vehicle.status === 'INACTIVE') {
      res.status(400).json({ success: false, message: 'Vehicle is not available for assignment' }); return;
    }
    await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ASSIGNED' } });
  }

  // Unassign previous vehicle
  if (driver.assignedVehicleId && driver.assignedVehicleId !== vehicleId) {
    await prisma.vehicle.update({ where: { id: driver.assignedVehicleId }, data: { status: 'AVAILABLE' } });
  }

  await prisma.driverProfile.update({ where: { userId: id }, data: { assignedVehicleId: vehicleId || null } });
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'ASSIGN_VEHICLE', entity: 'Driver', entityId: id, description: `Vehicle ${vehicleId} assigned to driver`, ipAddress: req.ip });
  sendSuccess(res, null, 'Vehicle assigned to driver successfully');
};

export const getAvailableDrivers = async (_req: Request, res: Response): Promise<void> => {
  const drivers = await prisma.driverProfile.findMany({
    where: { status: DriverStatus.AVAILABLE },
    include: {
      user: { select: { id: true, mobile: true, email: true, status: true } },
      assignedVehicle: { select: { id: true, registrationNumber: true, make: true, model: true, vehicleType: { select: { name: true } } } },
    },
    orderBy: { fullName: 'asc' },
  });
  sendSuccess(res, drivers);
};
