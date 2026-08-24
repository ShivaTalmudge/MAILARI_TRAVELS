import { prisma } from '../config/prisma';
import { TripType } from '@prisma/client';

interface PricingInput {
  vehicleTypeId: string;
  tripType: TripType;
  estimatedDistance?: number;   // km
  estimatedDuration?: number;   // hours
  isNightTrip?: boolean;
  hasAirport?: boolean;
  hasStateCrossing?: boolean;
  tollCharges?: number;
  parkingCharges?: number;
  extraCharges?: number;
  discount?: number;
}

interface PricingOutput {
  baseFare: number;
  distanceCharges: number;
  driverAllowance: number;
  nightCharges: number;
  airportCharges: number;
  statePermitCharges: number;
  tollCharges: number;
  parkingCharges: number;
  extraCharges: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  totalAmount: number;
}

export const calculateFare = async (input: PricingInput): Promise<PricingOutput> => {
  // Get pricing rule
  const rule = await prisma.pricingRule.findUnique({
    where: { vehicleTypeId_tripType: { vehicleTypeId: input.vehicleTypeId, tripType: input.tripType } },
  });

  // Get default tax config
  const taxConfig = await prisma.taxConfig.findFirst({ where: { isActive: true, isDefault: true } });

  const baseFare = Number(rule?.baseFare || 0);
  const distanceCharges = rule && input.estimatedDistance ? Number(rule.perKmRate) * input.estimatedDistance : 0;
  const hourlyCharges = rule && input.estimatedDuration ? Number(rule.perHourRate) * input.estimatedDuration : 0;
  const driverAllowance = Number(rule?.driverAllowanceDay || 0);

  const nightMultiplier = Number(rule?.nightChargeMultiplier || 1) - 1;
  const nightCharges = input.isNightTrip ? (baseFare + distanceCharges) * nightMultiplier : 0;

  const airportCharges = input.hasAirport ? Number(rule?.airportSurcharge || 0) : 0;
  const statePermitCharges = input.hasStateCrossing ? Number(rule?.statePermitCharge || 0) : 0;

  const tollCharges = input.tollCharges || 0;
  const parkingCharges = input.parkingCharges || 0;
  const extraCharges = input.extraCharges || 0;
  const discount = input.discount || 0;

  const subtotalBeforeDiscount = baseFare + distanceCharges + hourlyCharges + driverAllowance +
    nightCharges + airportCharges + statePermitCharges + tollCharges + parkingCharges + extraCharges;
  const subtotal = Math.max(0, subtotalBeforeDiscount - discount);

  const cgstRate = Number(taxConfig?.cgstRate || 0) / 100;
  const sgstRate = Number(taxConfig?.sgstRate || 0) / 100;
  const igstRate = Number(taxConfig?.igstRate || 0) / 100;

  const cgst = subtotal * cgstRate;
  const sgst = subtotal * sgstRate;
  const igst = subtotal * igstRate;
  const taxAmount = cgst + sgst + igst;
  const totalAmount = subtotal + taxAmount;

  return {
    baseFare,
    distanceCharges: distanceCharges + hourlyCharges,
    driverAllowance,
    nightCharges,
    airportCharges,
    statePermitCharges,
    tollCharges,
    parkingCharges,
    extraCharges,
    subtotal,
    discount,
    taxableAmount: subtotal,
    cgst,
    sgst,
    igst,
    taxAmount,
    totalAmount,
  };
};
