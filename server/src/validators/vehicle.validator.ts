import { z } from 'zod';

export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(4, 'Registration number is required').max(20),
  vehicleTypeId: z.string().min(1, 'Vehicle Type is required'),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(2, 'Model is required'),
  variant: z.string().optional(),
  year: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val >= 1990 && val <= new Date().getFullYear(), 'Invalid year'),
  color: z.string().optional(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID']),
  seatingCapacity: z.union([z.string(), z.number()]).transform(val => Number(val)).refine(val => val > 0, 'Seating capacity must be at least 1'),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.literal('')).optional().nullable(),
  permitNumber: z.string().optional(),
  permitExpiry: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.literal('')).optional().nullable(),
  fitnessNumber: z.string().optional(),
  fitnessExpiry: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.literal('')).optional().nullable(),
  pucNumber: z.string().optional(),
  pucExpiry: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.literal('')).optional().nullable(),
  currentOdometer: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  notes: z.string().optional(),
});

// Updates are partial by design (the controller COALESCEs each field
// against the existing row) — registrationNumber/vehicleTypeId are
// intentionally excluded since neither is editable after creation.
export const updateVehicleSchema = createVehicleSchema
  .omit({ registrationNumber: true, vehicleTypeId: true })
  .partial();
