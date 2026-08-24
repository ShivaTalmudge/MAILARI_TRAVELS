import { z } from 'zod';

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid Booking ID'),
  amount: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE']),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED']),
});
