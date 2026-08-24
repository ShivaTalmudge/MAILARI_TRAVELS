/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  MAILARI TRAVELS — DATABASE SEED                          ║
 * ║  DEVELOPMENT DATA ONLY — DO NOT USE IN PRODUCTION        ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

import { PrismaClient, Role, UserStatus, DriverStatus, VehicleStatus, BookingStatus, TripType, FuelType, PaymentMethod, PaymentStatus, TicketCategory, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding Mailari Travels database...');

  // ── System Settings ───────────────────────────────────
  console.log('  Creating system settings...');
  const settings = [
    { key: 'company_name', value: 'Mailari Travels', label: 'Company Name', category: 'company' },
    { key: 'company_tagline', value: 'Travel Safe. Travel Smart.', label: 'Tagline', category: 'company' },
    { key: 'company_phone', value: '+91 98765 43210', label: 'Phone', category: 'company' },
    { key: 'company_email', value: 'info@mailari.com', label: 'Email', category: 'company' },
    { key: 'company_address', value: '123, MG Road, Andheri West', label: 'Address', category: 'company' },
    { key: 'company_city', value: 'Mumbai', label: 'City', category: 'company' },
    { key: 'company_state', value: 'Maharashtra', label: 'State', category: 'company' },
    { key: 'company_pincode', value: '400053', label: 'Pincode', category: 'company' },
    { key: 'company_gstin', value: '27AABCT1332L1ZN', label: 'GSTIN', category: 'company' },
    { key: 'invoice_prefix', value: 'MT-INV', label: 'Invoice Prefix', category: 'invoice' },
    { key: 'currency', value: 'INR', label: 'Currency', category: 'general' },
    { key: 'currency_symbol', value: '₹', label: 'Currency Symbol', category: 'general' },
    { key: 'timezone', value: 'Asia/Kolkata', label: 'Timezone', category: 'general' },
    { key: 'date_format', value: 'DD MMM YYYY', label: 'Date Format', category: 'general' },
    { key: 'booking_cancellation_hours', value: '2', label: 'Cancellation Before Hours', category: 'booking' },
    { key: 'support_email', value: 'support@mailari.com', label: 'Support Email', category: 'support' },
    { key: 'support_phone', value: '+91 98765 43211', label: 'Support Phone', category: 'support' },
    { key: 'whatsapp_enabled', value: 'false', label: 'WhatsApp Notifications', category: 'notifications' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: s, create: { ...s, description: `${s.label} setting` } });
  }

  // ── Tax Config ────────────────────────────────────────
  console.log('  Creating tax configuration...');
  const taxConfig = await prisma.taxConfig.upsert({
    where: { name: 'GST 5%' },
    update: {},
    create: { name: 'GST 5%', cgstRate: 2.5, sgstRate: 2.5, igstRate: 0, isActive: true, isDefault: true },
  });

  // ── Vehicle Types ─────────────────────────────────────
  console.log('  Creating vehicle types...');
  const sedan = await prisma.vehicleType.upsert({ where: { name: 'Swift Dzire' }, update: {}, create: { name: 'Swift Dzire', description: 'Comfortable sedan for city and outstation travel', seatingCapacity: 4, luggageCapacity: 2, sortOrder: 1 } });
  const suv = await prisma.vehicleType.upsert({ where: { name: 'Ertiga' }, update: {}, create: { name: 'Ertiga', description: 'Spacious 6-seater for family trips', seatingCapacity: 6, luggageCapacity: 3, sortOrder: 2 } });
  const hatchback = await prisma.vehicleType.upsert({ where: { name: 'Hatchback' }, update: {}, create: { name: 'Hatchback', description: 'Economical hatchback for city travel', seatingCapacity: 4, luggageCapacity: 1, sortOrder: 3 } });
  const tempo = await prisma.vehicleType.upsert({ where: { name: 'Tempo Traveller' }, update: {}, create: { name: 'Tempo Traveller', description: 'Large capacity for group travel', seatingCapacity: 12, luggageCapacity: 6, sortOrder: 4 } });
  const luxury = await prisma.vehicleType.upsert({ where: { name: 'Luxury Car' }, update: {}, create: { name: 'Luxury Car', description: 'Premium luxury vehicles for VIP travel', seatingCapacity: 4, luggageCapacity: 2, sortOrder: 5 } });
  const premiumSuv = await prisma.vehicleType.upsert({ where: { name: 'Premium SUV' }, update: {}, create: { name: 'Premium SUV', description: 'Top-of-the-line premium SUV', seatingCapacity: 6, luggageCapacity: 3, sortOrder: 6 } });

  // ── Pricing Rules ─────────────────────────────────────
  console.log('  Creating pricing rules...');
  const pricingData = [
    { vehicleTypeId: sedan.id, tripType: TripType.LOCAL, baseFare: 150, perKmRate: 12, perHourRate: 80, driverAllowanceDay: 250 },
    { vehicleTypeId: sedan.id, tripType: TripType.OUTSTATION, baseFare: 300, perKmRate: 14, perHourRate: 0, driverAllowanceDay: 350, statePermitCharge: 200 },
    { vehicleTypeId: sedan.id, tripType: TripType.AIRPORT_TRANSFER, baseFare: 500, perKmRate: 15, perHourRate: 0, driverAllowanceDay: 0, airportSurcharge: 100 },
    { vehicleTypeId: sedan.id, tripType: TripType.ONE_WAY, baseFare: 200, perKmRate: 13, perHourRate: 0, driverAllowanceDay: 250 },
    { vehicleTypeId: sedan.id, tripType: TripType.FULL_DAY_RENTAL, baseFare: 0, perKmRate: 0, perHourRate: 120, driverAllowanceDay: 300 },

    { vehicleTypeId: suv.id, tripType: TripType.LOCAL, baseFare: 200, perKmRate: 16, perHourRate: 110, driverAllowanceDay: 300 },
    { vehicleTypeId: suv.id, tripType: TripType.OUTSTATION, baseFare: 400, perKmRate: 18, perHourRate: 0, driverAllowanceDay: 400, statePermitCharge: 250 },
    { vehicleTypeId: suv.id, tripType: TripType.AIRPORT_TRANSFER, baseFare: 700, perKmRate: 18, perHourRate: 0, driverAllowanceDay: 0, airportSurcharge: 150 },

    { vehicleTypeId: hatchback.id, tripType: TripType.LOCAL, baseFare: 100, perKmRate: 10, perHourRate: 70, driverAllowanceDay: 200 },
    { vehicleTypeId: hatchback.id, tripType: TripType.OUTSTATION, baseFare: 250, perKmRate: 12, perHourRate: 0, driverAllowanceDay: 300 },

    { vehicleTypeId: tempo.id, tripType: TripType.LOCAL, baseFare: 500, perKmRate: 22, perHourRate: 200, driverAllowanceDay: 500 },
    { vehicleTypeId: tempo.id, tripType: TripType.OUTSTATION, baseFare: 800, perKmRate: 25, perHourRate: 0, driverAllowanceDay: 600, statePermitCharge: 500 },

    { vehicleTypeId: luxury.id, tripType: TripType.LOCAL, baseFare: 500, perKmRate: 25, perHourRate: 200, driverAllowanceDay: 400 },
    { vehicleTypeId: luxury.id, tripType: TripType.AIRPORT_TRANSFER, baseFare: 1500, perKmRate: 28, perHourRate: 0, driverAllowanceDay: 0, airportSurcharge: 300 },

    { vehicleTypeId: premiumSuv.id, tripType: TripType.LOCAL, baseFare: 600, perKmRate: 28, perHourRate: 220, driverAllowanceDay: 450 },
    { vehicleTypeId: premiumSuv.id, tripType: TripType.OUTSTATION, baseFare: 900, perKmRate: 30, perHourRate: 0, driverAllowanceDay: 550, statePermitCharge: 400 },
  ];

  for (const p of pricingData) {
    await prisma.pricingRule.upsert({
      where: { vehicleTypeId_tripType: { vehicleTypeId: p.vehicleTypeId, tripType: p.tripType } },
      update: {},
      create: { ...p, nightChargeMultiplier: 1.25, extraKmRate: p.perKmRate + 2, isActive: true },
    });
  }

  // ── Admin User ────────────────────────────────────────
  console.log('  Creating admin account...');
  const admin = await prisma.user.upsert({
    where: { mobile: '9000000001' },
    update: {},
    create: {
      mobile: '9000000001',
      email: 'admin@mailari.com',
      passwordHash: await hash('Admin@123'),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // ── Driver Users ──────────────────────────────────────
  console.log('  Creating driver accounts...');
  const driversData = [
    { mobile: '9000000002', email: 'driver1@mailari.com', fullName: 'Rajesh Kumar', licenceNumber: 'MH0120230012345', city: 'Mumbai', state: 'Maharashtra' },
    { mobile: '9000000003', email: 'driver2@mailari.com', fullName: 'Suresh Patil', licenceNumber: 'MH0120230012346', city: 'Pune', state: 'Maharashtra' },
    { mobile: '9000000004', email: 'driver3@mailari.com', fullName: 'Anil Sharma', licenceNumber: 'DL0120230012347', city: 'Mumbai', state: 'Maharashtra' },
  ];

  const createdDrivers = [];
  for (const d of driversData) {
    const user = await prisma.user.upsert({
      where: { mobile: d.mobile },
      update: {},
      create: {
        mobile: d.mobile,
        email: d.email,
        passwordHash: await hash('Driver@123'),
        role: Role.DRIVER,
        status: UserStatus.ACTIVE,
        driverProfile: {
          create: {
            fullName: d.fullName,
            licenceNumber: d.licenceNumber,
            licenceExpiry: new Date('2027-12-31'),
            dateOfBirth: new Date('1990-06-15'),
            address: '45, Shivaji Nagar',
            city: d.city,
            state: d.state,
            pincode: '400001',
            emergencyContact: '9999900001',
            emergencyName: 'Family Contact',
            joiningDate: new Date('2024-01-01'),
            status: DriverStatus.AVAILABLE,
          },
        },
      },
      include: { driverProfile: true },
    });
    createdDrivers.push(user);
  }

  // ── Customer Users ────────────────────────────────────
  console.log('  Creating customer accounts...');
  const customersData = [
    { mobile: '9000000005', email: 'customer1@example.com', fullName: 'Priya Desai', city: 'Mumbai' },
    { mobile: '9000000006', email: 'customer2@example.com', fullName: 'Amit Joshi', city: 'Pune' },
    { mobile: '9000000007', email: 'customer3@example.com', fullName: 'Sunita Mehta', city: 'Mumbai' },
    { mobile: '9000000008', email: 'customer4@example.com', fullName: 'Vikram Singh', city: 'Nagpur' },
    { mobile: '9000000009', email: 'customer5@example.com', fullName: 'Kavitha Rao', city: 'Mumbai' },
  ];

  const createdCustomers = [];
  for (const c of customersData) {
    const user = await prisma.user.upsert({
      where: { mobile: c.mobile },
      update: {},
      create: {
        mobile: c.mobile,
        email: c.email,
        passwordHash: await hash('Customer@123'),
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        customerProfile: {
          create: {
            fullName: c.fullName,
            address: '12, Park Street',
            city: c.city,
            state: 'Maharashtra',
            pincode: '400001',
          },
        },
      },
      include: { customerProfile: true },
    });
    createdCustomers.push(user);
  }

  // ── Vehicles ──────────────────────────────────────────
  console.log('  Creating vehicles...');
  const vehiclesData = [
    { regNumber: 'MH 12 AB 1234', vehicleTypeId: sedan.id, make: 'Maruti Suzuki', model: 'Dzire', year: 2022, color: 'White', fuelType: FuelType.CNG, seating: 4 },
    { regNumber: 'MH 12 CD 5678', vehicleTypeId: suv.id, make: 'Tata', model: 'Innova Crysta', year: 2023, color: 'Silver', fuelType: FuelType.DIESEL, seating: 6 },
    { regNumber: 'MH 04 EF 9012', vehicleTypeId: hatchback.id, make: 'Maruti Suzuki', model: 'Swift', year: 2021, color: 'Red', fuelType: FuelType.PETROL, seating: 4 },
    { regNumber: 'MH 02 GH 3456', vehicleTypeId: tempo.id, make: 'Force', model: 'Tempo Traveller', year: 2022, color: 'White', fuelType: FuelType.DIESEL, seating: 12 },
    { regNumber: 'MH 01 IJ 7890', vehicleTypeId: luxury.id, make: 'Toyota', model: 'Fortuner', year: 2023, color: 'Black', fuelType: FuelType.DIESEL, seating: 6 },
  ];

  const createdVehicles = [];
  const futureDate = (months: number) => new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

  for (const v of vehiclesData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { registrationNumber: v.regNumber },
      update: {},
      create: {
        registrationNumber: v.regNumber,
        vehicleTypeId: v.vehicleTypeId,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        fuelType: v.fuelType,
        seatingCapacity: v.seating,
        insuranceNumber: `INS-2024-${Math.floor(Math.random() * 99999)}`,
        insuranceExpiry: futureDate(8),
        permitNumber: `PERMIT-${Math.floor(Math.random() * 99999)}`,
        permitExpiry: futureDate(6),
        fitnessNumber: `FIT-${Math.floor(Math.random() * 99999)}`,
        fitnessExpiry: futureDate(12),
        pucNumber: `PUC-${Math.floor(Math.random() * 99999)}`,
        pucExpiry: futureDate(3),
        currentOdometer: Math.floor(Math.random() * 50000),
        status: VehicleStatus.AVAILABLE,
      },
    });
    createdVehicles.push(vehicle);
  }

  // Assign vehicles to drivers
  const driver1Profile = await prisma.driverProfile.findUnique({ where: { userId: createdDrivers[0].id } });
  const driver2Profile = await prisma.driverProfile.findUnique({ where: { userId: createdDrivers[1].id } });
  const driver3Profile = await prisma.driverProfile.findUnique({ where: { userId: createdDrivers[2].id } });

  if (driver1Profile) {
    await prisma.driverProfile.update({ where: { id: driver1Profile.id }, data: { assignedVehicleId: createdVehicles[0].id } });
    await prisma.vehicle.update({ where: { id: createdVehicles[0].id }, data: { status: VehicleStatus.ASSIGNED } });
  }
  if (driver2Profile) {
    await prisma.driverProfile.update({ where: { id: driver2Profile.id }, data: { assignedVehicleId: createdVehicles[1].id } });
    await prisma.vehicle.update({ where: { id: createdVehicles[1].id }, data: { status: VehicleStatus.ASSIGNED } });
  }

  // ── Sample Bookings ───────────────────────────────────
  console.log('  Creating sample bookings...');
  const customer1Profile = await prisma.customerProfile.findUnique({ where: { userId: createdCustomers[0].id } });
  const customer2Profile = await prisma.customerProfile.findUnique({ where: { userId: createdCustomers[1].id } });
  const customer3Profile = await prisma.customerProfile.findUnique({ where: { userId: createdCustomers[2].id } });

  if (!customer1Profile || !customer2Profile || !customer3Profile) {
    throw new Error('Customer profiles not found');
  }

  // Completed booking with payment and invoice
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'MT-2601-0001',
      customerId: customer1Profile.id,
      driverId: driver1Profile?.id,
      vehicleId: createdVehicles[0].id,
      vehicleTypeId: sedan.id,
      tripType: TripType.LOCAL,
      status: BookingStatus.TRIP_COMPLETED,
      pickupLocation: '12, Park Street, Andheri West, Mumbai',
      dropLocation: 'Chhatrapati Shivaji Maharaj International Airport, Mumbai',
      pickupDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      pickupTime: '06:00',
      passengerCount: 2,
      luggageCount: 2,
      estimatedDistance: 25,
      baseFare: 150,
      distanceCharges: 300,
      driverAllowance: 0,
      tollCharges: 75,
      parkingCharges: 0,
      airportCharges: 100,
      nightCharges: 0,
      subtotal: 625,
      taxAmount: 31.25,
      totalAmount: 656.25,
      paymentStatus: PaymentStatus.PAID,
      paidAmount: 656.25,
      statusHistory: {
        create: [
          { status: BookingStatus.PENDING, note: 'Booking created' },
          { status: BookingStatus.CONFIRMED, note: 'Admin confirmed' },
          { status: BookingStatus.DRIVER_ASSIGNED, note: 'Driver Rajesh Kumar assigned' },
          { status: BookingStatus.DRIVER_ACCEPTED, note: 'Driver accepted trip' },
          { status: BookingStatus.TRIP_STARTED, note: 'Trip started' },
          { status: BookingStatus.TRIP_COMPLETED, note: 'Trip completed successfully' },
        ],
      },
    },
  });

  // Payment for booking1
  const payment1 = await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-001',
      bookingId: booking1.id,
      amount: 656.25,
      paymentMethod: PaymentMethod.UPI,
      status: PaymentStatus.PAID,
      transactionRef: 'UPI-TXN-2024-001',
      paymentDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });

  // Invoice for booking1
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'MT-INV-24-00001',
      bookingId: booking1.id,
      subtotal: 625,
      cgst: 15.625,
      sgst: 15.625,
      igst: 0,
      taxTotal: 31.25,
      discount: 0,
      totalAmount: 656.25,
      paymentStatus: PaymentStatus.PAID,
      items: {
        create: [
          { description: 'Base Fare', quantity: 1, unitPrice: 150, amount: 150, sortOrder: 1 },
          { description: 'Distance Charges (25 km)', quantity: 1, unitPrice: 300, amount: 300, sortOrder: 2 },
          { description: 'Airport Surcharge', quantity: 1, unitPrice: 100, amount: 100, sortOrder: 3 },
          { description: 'Toll Charges', quantity: 1, unitPrice: 75, amount: 75, sortOrder: 4 },
        ],
      },
    },
  });

  // Confirmed booking awaiting driver
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.booking.create({
    data: {
      bookingNumber: 'MT-2601-0002',
      customerId: customer2Profile.id,
      vehicleTypeId: suv.id,
      tripType: TripType.OUTSTATION,
      status: BookingStatus.CONFIRMED,
      pickupLocation: 'Hotel Taj, Colaba, Mumbai',
      dropLocation: 'Lonavala, Maharashtra',
      pickupDate: tomorrow,
      pickupTime: '08:00',
      passengerCount: 4,
      luggageCount: 3,
      estimatedDistance: 85,
      baseFare: 400,
      distanceCharges: 1530,
      driverAllowance: 400,
      tollCharges: 120,
      statePermitCharges: 0,
      subtotal: 2450,
      taxAmount: 122.5,
      totalAmount: 2572.5,
      paymentStatus: PaymentStatus.PENDING,
      statusHistory: {
        create: [
          { status: BookingStatus.PENDING, note: 'Booking created' },
          { status: BookingStatus.CONFIRMED, note: 'Admin confirmed booking' },
        ],
      },
    },
  });

  // Pending booking
  await prisma.booking.create({
    data: {
      bookingNumber: 'MT-2601-0003',
      customerId: customer3Profile.id,
      vehicleTypeId: sedan.id,
      tripType: TripType.AIRPORT_TRANSFER,
      status: BookingStatus.PENDING,
      pickupLocation: '56, MG Road, Bandra, Mumbai',
      dropLocation: 'Chhatrapati Shivaji Maharaj International Airport, Mumbai',
      pickupDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      pickupTime: '04:30',
      passengerCount: 1,
      luggageCount: 2,
      flightNumber: 'AI 302',
      flightType: 'DEPARTURE',
      estimatedDistance: 18,
      baseFare: 500,
      distanceCharges: 270,
      airportCharges: 100,
      nightCharges: 162.5,
      tollCharges: 75,
      subtotal: 1107.5,
      taxAmount: 55.375,
      totalAmount: 1162.875,
      paymentStatus: PaymentStatus.PENDING,
      statusHistory: { create: [{ status: BookingStatus.PENDING, note: 'Booking created by customer' }] },
    },
  });

  // ── Notifications ─────────────────────────────────────
  console.log('  Creating notifications...');
  const notifData = [
    { userId: createdCustomers[0].id, type: NotificationType.TRIP_COMPLETED, title: 'Trip Completed', message: 'Your trip to Mumbai Airport has been completed. Thank you for choosing Mailari Travels!', isRead: false },
    { userId: createdCustomers[0].id, type: NotificationType.INVOICE_GENERATED, title: 'Invoice Generated', message: 'Invoice MT-INV-24-00001 has been generated for your booking MT-2601-0001.', isRead: true },
    { userId: createdCustomers[1].id, type: NotificationType.BOOKING_CONFIRMED, title: 'Booking Confirmed', message: 'Your outstation booking MT-2601-0002 to Lonavala has been confirmed.', isRead: false },
    { userId: createdDrivers[0].id, type: NotificationType.DRIVER_ASSIGNED, title: 'Trip Assigned', message: 'You have a new trip assignment. Please check your trips section.', isRead: false },
    { userId: admin.id, type: NotificationType.BOOKING_CREATED, title: 'New Booking', message: 'New booking MT-2601-0003 received from Kavitha Rao.', isRead: false },
  ];

  for (const n of notifData) {
    await prisma.notification.create({ data: n });
  }

  // ── Support Tickets ───────────────────────────────────
  console.log('  Creating sample support tickets...');
  await prisma.supportTicket.create({
    data: {
      ticketNumber: 'TKT-00001',
      userId: createdCustomers[0].id,
      category: TicketCategory.PAYMENT,
      subject: 'Invoice not received for booking',
      status: 'RESOLVED',
      messages: {
        create: [
          { senderId: createdCustomers[0].id, senderRole: Role.CUSTOMER, message: 'Hello, I completed my trip but have not received the invoice yet. Booking number MT-2601-0001.' },
          { senderId: admin.id, senderRole: Role.ADMIN, message: 'Hello Priya, your invoice MT-INV-24-00001 has been generated. You can download it from the Invoices section. Regards, Mailari Travels Support.' },
        ],
      },
    },
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 DEVELOPMENT CREDENTIALS (DO NOT USE IN PRODUCTION):');
  console.log('─'.repeat(60));
  console.log('  ADMIN    | admin@mailari.com    | 9000000001 | Admin@123');
  console.log('  DRIVER 1 | driver1@mailari.com  | 9000000002 | Driver@123');
  console.log('  DRIVER 2 | driver2@mailari.com  | 9000000003 | Driver@123');
  console.log('  DRIVER 3 | driver3@mailari.com  | 9000000004 | Driver@123');
  console.log('  CUST 1   | customer1@example.com | 9000000005 | Customer@123');
  console.log('  CUST 2   | customer2@example.com | 9000000006 | Customer@123');
  console.log('  CUST 3   | customer3@example.com | 9000000007 | Customer@123');
  console.log('  CUST 4   | customer4@example.com | 9000000008 | Customer@123');
  console.log('  CUST 5   | customer5@example.com | 9000000009 | Customer@123');
  console.log('─'.repeat(60));
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
