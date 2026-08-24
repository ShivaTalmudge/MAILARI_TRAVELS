import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password';
import { signToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';
import { sendSuccess, sendCreated, sendError, sendUnauthorized } from '../utils/response';
import { createAuditLog } from '../utils/helpers';
import { Role, UserStatus } from '@prisma/client';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { fullName, mobile, email, password, address, city, state, pincode } = req.body;

  // Check existing user
  const existing = await prisma.user.findFirst({
    where: { OR: [{ mobile }, ...(email ? [{ email }] : [])] },
  });
  if (existing) {
    sendError(res, 'An account with this mobile number or email already exists.', 409);
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      mobile,
      email: email || null,
      passwordHash,
      role: Role.CUSTOMER,
      customerProfile: {
        create: { fullName, address, city, state, pincode },
      },
    },
    include: { customerProfile: true },
  });

  const token = signToken({ userId: user.id, role: user.role, mobile: user.mobile || '', email: user.email || undefined });

  await createAuditLog({
    userId: user.id, userRole: user.role,
    action: 'REGISTER', entity: 'User', entityId: user.id,
    description: `Customer registered: ${fullName}`,
    ipAddress: req.ip,
  });

  sendCreated(res, {
    token,
    user: { id: user.id, role: user.role, fullName, mobile, email: user.email },
  }, 'Registration successful. Welcome to Mailari Travels!');
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { identifier, password, role } = req.body;

  // Find user by mobile or email
  const user = await prisma.user.findFirst({
    where: {
      AND: [
        { OR: [{ mobile: identifier }, { email: identifier }] },
        { role: role as Role },
      ],
    },
    include: {
      customerProfile: true,
      driverProfile: true,
    },
  });

  if (!user) {
    sendUnauthorized(res, 'Invalid credentials. Please check your mobile/email and password.');
    return;
  }

  if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
    sendUnauthorized(res, 'Your account has been disabled. Please contact Mailari Travels support.');
    return;
  }

  if (!user.passwordHash) {
    sendUnauthorized(res, 'This account uses Google Login. Please sign in with Google.');
    return;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    sendUnauthorized(res, 'Invalid credentials. Please check your mobile/email and password.');
    return;
  }

  // Update last login
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ userId: user.id, role: user.role, mobile: user.mobile || '', email: user.email || undefined });

  await createAuditLog({
    userId: user.id, userRole: user.role,
    action: 'LOGIN', entity: 'User', entityId: user.id,
    description: `User logged in: ${user.mobile}`,
    ipAddress: req.ip,
  });

  const profile = user.customerProfile || user.driverProfile;
  const fullName = profile && 'fullName' in profile ? profile.fullName : '';

  sendSuccess(res, {
    token,
    user: { id: user.id, role: user.role, fullName, mobile: user.mobile, email: user.email },
  }, 'Login successful');
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    await createAuditLog({
      userId: req.user.userId, userRole: req.user.role,
      action: 'LOGOUT', entity: 'User', entityId: req.user.userId,
      description: 'User logged out',
      ipAddress: req.ip,
    });
  }
  res.clearCookie('token');
  sendSuccess(res, null, 'Logged out successfully');
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { identifier } = req.body;

  const user = await prisma.user.findFirst({
    where: { OR: [{ mobile: identifier }, { email: identifier }] },
  });

  // Always return success to prevent user enumeration
  if (!user) {
    sendSuccess(res, null, 'If an account with this mobile/email exists, you will receive password reset instructions.');
    return;
  }

  const resetToken = generateResetToken();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: resetToken, passwordResetExpiry: expiry },
  });

  // In production, send via SMS/email. For now, log for development.
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset token for ${identifier}: ${resetToken}`);
  }

  sendSuccess(res, 
    process.env.NODE_ENV === 'development' ? { resetToken } : null,
    'Password reset instructions have been sent.'
  );
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    sendError(res, 'Invalid or expired reset token.', 400);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
  });

  sendSuccess(res, null, 'Password reset successfully. You can now log in.');
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { sendError(res, 'User not found.', 404); return; }
  if (!user.passwordHash) { sendError(res, 'Account uses third-party login.', 400); return; }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    sendError(res, 'Current password is incorrect.', 400);
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await createAuditLog({
    userId, userRole: user.role,
    action: 'CHANGE_PASSWORD', entity: 'User', entityId: userId,
    description: 'User changed password',
    ipAddress: req.ip,
  });

  sendSuccess(res, null, 'Password changed successfully.');
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, mobile: true, role: true, status: true,
      lastLoginAt: true, createdAt: true,
      customerProfile: { select: { fullName: true, address: true, city: true, state: true, pincode: true } },
      driverProfile: { select: { fullName: true, licenceNumber: true, licenceExpiry: true, status: true, profilePhoto: true } },
    },
  });
  if (!user) { sendError(res, 'User not found.', 404); return; }
  sendSuccess(res, user);
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body;
  
  if (!credential) {
    sendError(res, 'Google credential token is missing.', 400);
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    sendError(res, 'Google Auth is not configured on the server.', 500);
    return;
  }

  const client = new OAuth2Client(clientId);
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      sendError(res, 'Invalid Google token payload.', 400);
      return;
    }

    const email = payload.email;
    const name = payload.name || 'Google User';
    const googleId = payload.sub;
    const avatarUrl = payload.picture;

    // Check if user exists by email or googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      },
      include: { customerProfile: true, driverProfile: true }
    });

    if (user) {
      // Existing user. 
      // If they registered with email/password and now log in with Google, link account safely
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, authProvider: 'GOOGLE', emailVerified: true, avatarUrl },
          include: { customerProfile: true, driverProfile: true }
        });
      }
      
      if (user.status !== UserStatus.ACTIVE) {
        sendUnauthorized(res, 'Your account has been disabled. Please contact support.');
        return;
      }
    } else {
      // New User Registration via Google
      user = await prisma.user.create({
        data: {
          email,
          authProvider: 'GOOGLE',
          googleId,
          emailVerified: true,
          avatarUrl,
          role: Role.CUSTOMER,
          customerProfile: {
            create: { fullName: name },
          },
        },
        include: { customerProfile: true, driverProfile: true },
      });
      
      await createAuditLog({
        userId: user.id, userRole: user.role,
        action: 'REGISTER', entity: 'User', entityId: user.id,
        description: `Customer registered via Google: ${name}`,
        ipAddress: req.ip,
      });
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = signToken({ userId: user.id, role: user.role, mobile: user.mobile || '', email: user.email || undefined });

    await createAuditLog({
      userId: user.id, userRole: user.role,
      action: 'LOGIN', entity: 'User', entityId: user.id,
      description: `User logged in via Google: ${email}`,
      ipAddress: req.ip,
    });

    const profile = user.customerProfile || user.driverProfile;
    const fullName = profile && 'fullName' in profile ? profile.fullName : '';

    sendSuccess(res, {
      token,
      user: { id: user.id, role: user.role, fullName, mobile: user.mobile, email: user.email, avatarUrl: user.avatarUrl },
    }, 'Login successful');
    
  } catch (error) {
    console.error('Google Auth Error:', error);
    sendUnauthorized(res, 'Invalid Google token.');
  }
};
