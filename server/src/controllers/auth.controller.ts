import { Request, Response } from 'express';
import { pool } from '../config/db';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password';
import { signToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';
import { sendSuccess, sendCreated, sendError, sendUnauthorized } from '../utils/response';
import { createAuditLog } from '../utils/helpers';
import { Role, UserStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2/promise';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { fullName, mobile, email, password, address, city, state, pincode } = req.body;

  try {
    const [existing]: any = await pool.execute(
      'SELECT id FROM users WHERE mobile = ? OR (email IS NOT NULL AND email = ?)',
      [mobile, email || null]
    );

    if (existing.length > 0) {
      sendError(res, 'An account with this mobile number or email already exists.', 409);
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const profileId = uuidv4();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        `INSERT INTO users (id, mobile, email, passwordHash, role, status, authProvider, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'LOCAL', false, NOW(), NOW())`,
        [userId, mobile, email || null, passwordHash, Role.CUSTOMER, UserStatus.ACTIVE]
      );

      await connection.execute(
        `INSERT INTO customer_profiles (id, userId, fullName, address, city, state, pincode, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [profileId, userId, fullName, address || null, city || null, state || null, pincode || null]
      );

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const token = signToken({ userId, role: Role.CUSTOMER, mobile: mobile || '', email: email || undefined });

    await createAuditLog({
      userId, userRole: Role.CUSTOMER,
      action: 'REGISTER', entity: 'User', entityId: userId,
      description: `Customer registered: ${fullName}`,
      ipAddress: req.ip,
    });

    sendCreated(res, {
      token,
      user: { id: userId, role: Role.CUSTOMER, fullName, mobile, email: email || null },
    }, 'Registration successful. Welcome to Mailari Travels!');
  } catch (err: any) {
    console.error('Registration error:', err);
    sendError(res, 'Internal server error during registration', 500);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { identifier, password, role } = req.body;

  try {
    const [users]: any = await pool.execute(
      `SELECT u.*, 
        c.fullName as customerName, c.id as customerId,
        d.fullName as driverName, d.id as driverId
       FROM users u
       LEFT JOIN customer_profiles c ON u.id = c.userId
       LEFT JOIN driver_profiles d ON u.id = d.userId
       WHERE (u.mobile = ? OR u.email = ?) AND u.role = ?`,
      [identifier, identifier, role]
    );

    if (users.length === 0) {
      sendUnauthorized(res, 'Invalid credentials. Please check your mobile/email and password.');
      return;
    }

    const user = users[0];

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

    await pool.execute('UPDATE users SET lastLoginAt = NOW() WHERE id = ?', [user.id]);

    const token = signToken({ userId: user.id, role: user.role, mobile: user.mobile || '', email: user.email || undefined });

    await createAuditLog({
      userId: user.id, userRole: user.role,
      action: 'LOGIN', entity: 'User', entityId: user.id,
      description: `User logged in: ${user.mobile || user.email}`,
      ipAddress: req.ip,
    });

    const fullName = user.customerName || user.driverName || '';

    sendSuccess(res, {
      token,
      user: { id: user.id, role: user.role, fullName, mobile: user.mobile, email: user.email },
    }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 'Internal server error during login', 500);
  }
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

  const [users]: any = await pool.execute(
    'SELECT id FROM users WHERE mobile = ? OR email = ?',
    [identifier, identifier]
  );

  if (users.length === 0) {
    sendSuccess(res, null, 'If an account with this mobile/email exists, you will receive password reset instructions.');
    return;
  }

  const user = users[0];
  const resetToken = generateResetToken();
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await pool.execute(
    'UPDATE users SET passwordResetToken = ?, passwordResetExpiry = ? WHERE id = ?',
    [resetToken, expiry, user.id]
  );

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

  const [users]: any = await pool.execute(
    'SELECT id FROM users WHERE passwordResetToken = ? AND passwordResetExpiry > NOW()',
    [token]
  );

  if (users.length === 0) {
    sendError(res, 'Invalid or expired reset token.', 400);
    return;
  }

  const user = users[0];
  const passwordHash = await hashPassword(password);
  
  await pool.execute(
    'UPDATE users SET passwordHash = ?, passwordResetToken = NULL, passwordResetExpiry = NULL WHERE id = ?',
    [passwordHash, user.id]
  );

  sendSuccess(res, null, 'Password reset successfully. You can now log in.');
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  const [users]: any = await pool.execute('SELECT passwordHash, role FROM users WHERE id = ?', [userId]);
  
  if (users.length === 0) { sendError(res, 'User not found.', 404); return; }
  const user = users[0];
  
  if (!user.passwordHash) { sendError(res, 'Account uses third-party login.', 400); return; }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    sendError(res, 'Current password is incorrect.', 400);
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await pool.execute('UPDATE users SET passwordHash = ? WHERE id = ?', [passwordHash, userId]);

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
  
  const [users]: any = await pool.execute(
    `SELECT u.id, u.email, u.mobile, u.role, u.status, u.lastLoginAt, u.createdAt,
      c.fullName as customerName, c.address as customerAddress, c.city as customerCity, c.state as customerState, c.pincode as customerPincode,
      d.fullName as driverName, d.licenceNumber as driverLicence, d.licenceExpiry as driverLicenceExpiry, d.status as driverProfileStatus, d.profilePhoto as driverPhoto
     FROM users u
     LEFT JOIN customer_profiles c ON u.id = c.userId
     LEFT JOIN driver_profiles d ON u.id = d.userId
     WHERE u.id = ?`,
    [userId]
  );

  if (users.length === 0) { sendError(res, 'User not found.', 404); return; }
  
  const user = users[0];
  const response: any = {
    id: user.id, email: user.email, mobile: user.mobile, role: user.role, status: user.status, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt
  };

  if (user.customerName) {
    response.customerProfile = {
      fullName: user.customerName, address: user.customerAddress, city: user.customerCity, state: user.customerState, pincode: user.customerPincode
    };
  }
  if (user.driverName) {
    response.driverProfile = {
      fullName: user.driverName, licenceNumber: user.driverLicence, licenceExpiry: user.driverLicenceExpiry, status: user.driverProfileStatus, profilePhoto: user.driverPhoto
    };
  }

  sendSuccess(res, response);
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

    const [users]: any = await pool.execute(
      `SELECT u.*,
        c.fullName as customerName, c.id as customerId,
        d.fullName as driverName, d.id as driverId
       FROM users u
       LEFT JOIN customer_profiles c ON u.id = c.userId
       LEFT JOIN driver_profiles d ON u.id = d.userId
       WHERE u.googleId = ? OR u.email = ?`,
      [googleId, email]
    );

    let user = users.length > 0 ? users[0] : null;

    // Google sign-in is a CUSTOMER-only entry point. If this email already
    // belongs to an ADMIN or DRIVER account, refuse rather than logging the
    // caller in as that account — an attacker who verifies a staff member's
    // email address via Google must not be able to assume their role.
    if (user && user.role !== Role.CUSTOMER) {
      sendUnauthorized(res, 'This email is not registered for customer sign-in. Please use your staff login.');
      return;
    }

    if (user) {
      if (!user.googleId) {
        await pool.execute(
          'UPDATE users SET googleId = ?, authProvider = "GOOGLE", emailVerified = true, avatarUrl = ? WHERE id = ?',
          [googleId, avatarUrl, user.id]
        );
      }
      
      if (user.status !== UserStatus.ACTIVE) {
        sendUnauthorized(res, 'Your account has been disabled. Please contact support.');
        return;
      }
    } else {
      const userId = uuidv4();
      const profileId = uuidv4();
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        await connection.execute(
          `INSERT INTO users (id, email, authProvider, googleId, emailVerified, avatarUrl, role, status, createdAt, updatedAt)
           VALUES (?, ?, 'GOOGLE', ?, true, ?, ?, ?, NOW(), NOW())`,
          [userId, email, googleId, avatarUrl || null, Role.CUSTOMER, UserStatus.ACTIVE]
        );
        await connection.execute(
          `INSERT INTO customer_profiles (id, userId, fullName, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())`,
          [profileId, userId, name]
        );
        await connection.commit();
        
        user = { id: userId, role: Role.CUSTOMER, mobile: null, email, customerName: name, driverName: null, avatarUrl };
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        connection.release();
      }
      
      await createAuditLog({
        userId: user.id, userRole: user.role,
        action: 'REGISTER', entity: 'User', entityId: user.id,
        description: `Customer registered via Google: ${name}`,
        ipAddress: req.ip,
      });
    }

    await pool.execute('UPDATE users SET lastLoginAt = NOW() WHERE id = ?', [user.id]);

    const token = signToken({ userId: user.id, role: user.role, mobile: user.mobile || '', email: user.email || undefined });

    await createAuditLog({
      userId: user.id, userRole: user.role,
      action: 'LOGIN', entity: 'User', entityId: user.id,
      description: `User logged in via Google: ${email}`,
      ipAddress: req.ip,
    });

    const fullName = user.customerName || user.driverName || name || '';

    sendSuccess(res, {
      token,
      user: { id: user.id, role: user.role, fullName, mobile: user.mobile, email: user.email, avatarUrl: user.avatarUrl },
    }, 'Login successful');
    
  } catch (error) {
    console.error('Google Auth Error:', error);
    sendUnauthorized(res, 'Invalid Google token.');
  }
};
