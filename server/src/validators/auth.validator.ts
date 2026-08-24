import { z } from 'zod';

const indianMobile = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits, starting with 6-9)');

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  mobile: indianMobile,
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: strongPassword,
  confirmPassword: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode (6 digits)').optional().or(z.literal('')),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Mobile number or email is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['CUSTOMER', 'DRIVER', 'ADMIN']),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Mobile number or email is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: strongPassword,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPassword,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createDriverSchema = z.object({
  fullName: z.string().min(2).max(100),
  mobile: indianMobile,
  email: z.string().email().optional().or(z.literal('')),
  password: strongPassword,
  licenceNumber: z.string().min(5, 'Licence number is required'),
  licenceExpiry: z.string().datetime(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal('')),
  emergencyContact: z.string().optional(),
  emergencyName: z.string().optional(),
  joiningDate: z.string().datetime().optional(),
});

export { indianMobile, strongPassword };
