import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { getPaginationParams, createAuditLog } from '../utils/helpers';
import { UserStatus } from '@prisma/client';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { search, status } = req.query as { search?: string; status?: string };

  const where = {
    role: 'CUSTOMER' as const,
    ...(status ? { status: status as UserStatus } : {}),
    ...(search ? {
      OR: [
        { mobile: { contains: search } },
        { email: { contains: search } },
        { customerProfile: { fullName: { contains: search } } },
      ],
    } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, mobile: true, status: true, lastLoginAt: true, createdAt: true,
        customerProfile: { select: { id: true, fullName: true, city: true, state: true, _count: { select: { bookings: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, customers, 'Customers fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Customers can only view their own data
  if (req.user?.role === 'CUSTOMER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, mobile: true, status: true, lastLoginAt: true, createdAt: true,
      customerProfile: {
        include: {
          bookings: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { vehicleType: true, driver: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (!user || user.customerProfile === null) { sendNotFound(res, 'Customer not found'); return; }
  sendSuccess(res, user);
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (req.user?.role === 'CUSTOMER' && req.user.userId !== id) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  const { fullName, email, address, city, state, pincode } = req.body;

  const user = await prisma.user.findUnique({ where: { id }, include: { customerProfile: true } });
  if (!user) { sendNotFound(res, 'Customer not found'); return; }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { email: email || null } }),
    prisma.customerProfile.update({
      where: { userId: id },
      data: { fullName, address, city, state, pincode },
    }),
  ]);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'UPDATE', entity: 'Customer', entityId: id, description: `Customer profile updated: ${fullName}` });
  sendSuccess(res, null, 'Customer updated successfully');
};

export const updateCustomerStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
  if (!user) { sendNotFound(res, 'Customer not found'); return; }

  await prisma.user.update({ where: { id }, data: { status } });
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Customer', entityId: id, description: `Customer status changed to ${status}`, ipAddress: req.ip });
  sendSuccess(res, null, `Customer ${status.toLowerCase()} successfully`);
};

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  req.params.id = req.user!.userId;
  return getCustomerById(req, res);
};
