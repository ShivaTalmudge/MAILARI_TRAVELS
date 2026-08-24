import { z } from 'zod';

export const createBookingSchema = z.object({
  customerId: z.string().optional(), // required only for ADMIN, handled in controller
  vehicleTypeId: z.string().uuid('Invalid Vehicle Type ID'),
  tripType: z.enum(['LOCAL', 'OUTSTATION', 'AIRPORT_TRANSFER', 'ONE_WAY', 'ROUND_TRIP']),
  pickupLocation: z.string().min(5, 'Pickup location is too short'),
  dropLocation: z.string().optional(),
  pickupDate: z.string().datetime({ message: 'Invalid pickup date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  returnDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  passengerCount: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, 'Passenger count must be at least 1'),
  luggageCount: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  estimatedDistance: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  estimatedDuration: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  flightNumber: z.string().optional(),
  flightType: z.enum(['DOMESTIC', 'INTERNATIONAL']).optional(),
  hasAirport: z.boolean().optional(),
  hasStateCrossing: z.boolean().optional(),
  tollCharges: z.union([z.string(), z.number()]).optional(),
  parkingCharges: z.union([z.string(), z.number()]).optional(),
  extraCharges: z.union([z.string(), z.number()]).optional(),
  discount: z.union([z.string(), z.number()]).optional(),
  specialInstructions: z.string().optional(),
});
