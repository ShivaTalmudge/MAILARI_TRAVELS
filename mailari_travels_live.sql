-- Mailari Travels CRM
-- Initial Database Setup Script for Hostinger phpMyAdmin

SET FOREIGN_KEY_CHECKS=0;

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `authProvider` VARCHAR(191) NOT NULL DEFAULT 'LOCAL',
    `googleId` VARCHAR(191) NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `avatarUrl` VARCHAR(191) NULL,
    `role` ENUM('CUSTOMER', 'DRIVER', 'ADMIN') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,
    `passwordResetToken` VARCHAR(191) NULL,
    `passwordResetExpiry` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_mobile_key`(`mobile`),
    UNIQUE INDEX `users_googleId_key`(`googleId`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_mobile_idx`(`mobile`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `customer_profiles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customer_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_profiles_userId_key`(`userId`),
    INDEX `customer_profiles_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `driver_profiles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `driver_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `licenceNumber` VARCHAR(191) NOT NULL,
    `licenceExpiry` DATETIME(3) NOT NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `emergencyName` VARCHAR(191) NULL,
    `joiningDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('AVAILABLE', 'ON_TRIP', 'OFFLINE', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `profilePhoto` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `assignedVehicleId` VARCHAR(191) NULL,

    UNIQUE INDEX `driver_profiles_userId_key`(`userId`),
    UNIQUE INDEX `driver_profiles_licenceNumber_key`(`licenceNumber`),
    INDEX `driver_profiles_userId_idx`(`userId`),
    INDEX `driver_profiles_licenceNumber_idx`(`licenceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `vehicle_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicle_types` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `seatingCapacity` INTEGER NOT NULL,
    `luggageCapacity` INTEGER NOT NULL DEFAULT 2,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_types_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `vehicles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NOT NULL,
    `vehicleTypeId` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `variant` VARCHAR(191) NULL,
    `year` INTEGER NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `fuelType` ENUM('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID') NOT NULL DEFAULT 'PETROL',
    `seatingCapacity` INTEGER NOT NULL,
    `insuranceNumber` VARCHAR(191) NULL,
    `insuranceExpiry` DATETIME(3) NULL,
    `permitNumber` VARCHAR(191) NULL,
    `permitExpiry` DATETIME(3) NULL,
    `fitnessNumber` VARCHAR(191) NULL,
    `fitnessExpiry` DATETIME(3) NULL,
    `pucNumber` VARCHAR(191) NULL,
    `pucExpiry` DATETIME(3) NULL,
    `currentOdometer` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicles_registrationNumber_key`(`registrationNumber`),
    INDEX `vehicles_registrationNumber_idx`(`registrationNumber`),
    INDEX `vehicles_vehicleTypeId_idx`(`vehicleTypeId`),
    INDEX `vehicles_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `vehicle_documents`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicle_documents` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `documentType` ENUM('INSURANCE', 'PUC', 'PERMIT', 'FITNESS', 'REGISTRATION', 'OTHER') NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vehicle_documents_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_documents_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `bookings`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `bookingNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `vehicleTypeId` VARCHAR(191) NULL,
    `tripType` ENUM('LOCAL', 'OUTSTATION', 'AIRPORT_TRANSFER', 'ONE_WAY', 'ROUND_TRIP', 'FULL_DAY_RENTAL', 'CUSTOM') NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_ON_THE_WAY', 'ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `pickupLocation` TEXT NOT NULL,
    `dropLocation` TEXT NULL,
    `pickupDate` DATETIME(3) NOT NULL,
    `pickupTime` VARCHAR(191) NOT NULL,
    `returnDate` DATETIME(3) NULL,
    `passengerCount` INTEGER NOT NULL DEFAULT 1,
    `luggageCount` INTEGER NOT NULL DEFAULT 0,
    `estimatedDistance` DECIMAL(10, 2) NULL,
    `estimatedDuration` INTEGER NULL,
    `flightNumber` VARCHAR(191) NULL,
    `flightType` VARCHAR(191) NULL,
    `baseFare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `distanceCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `driverAllowance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `tollCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `parkingCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `airportCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `nightCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `statePermitCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `extraCharges` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `specialInstructions` TEXT NULL,
    `adminNotes` TEXT NULL,
    `driverNotes` TEXT NULL,
    `paymentStatus` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_bookingNumber_key`(`bookingNumber`),
    INDEX `bookings_bookingNumber_idx`(`bookingNumber`),
    INDEX `bookings_customerId_idx`(`customerId`),
    INDEX `bookings_driverId_idx`(`driverId`),
    INDEX `bookings_status_idx`(`status`),
    INDEX `bookings_pickupDate_idx`(`pickupDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `booking_status_history`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `booking_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_ON_THE_WAY', 'ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL,
    `note` VARCHAR(191) NULL,
    `changedBy` VARCHAR(191) NULL,
    `changedByRole` ENUM('CUSTOMER', 'DRIVER', 'ADMIN') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_status_history_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `trips`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `trips` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `startOdometer` INTEGER NULL,
    `endOdometer` INTEGER NULL,
    `startTime` DATETIME(3) NULL,
    `endTime` DATETIME(3) NULL,
    `actualDistance` DECIMAL(10, 2) NULL,
    `actualDuration` INTEGER NULL,
    `driverNotes` TEXT NULL,
    `issueReported` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `trips_bookingId_idx`(`bookingId`),
    INDEX `trips_driverId_idx`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `payments`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'ONLINE') NOT NULL,
    `status` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `transactionRef` VARCHAR(191) NULL,
    `gatewayOrderId` VARCHAR(191) NULL,
    `gatewayPaymentId` VARCHAR(191) NULL,
    `paymentDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_paymentNumber_key`(`paymentNumber`),
    INDEX `payments_bookingId_idx`(`bookingId`),
    INDEX `payments_paymentNumber_idx`(`paymentNumber`),
    INDEX `payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `invoices`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `cgst` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `sgst` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `igst` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `invoices_bookingId_key`(`bookingId`),
    INDEX `invoices_bookingId_idx`(`bookingId`),
    INDEX `invoices_invoiceNumber_idx`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `invoice_items`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `pricing_rules`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pricing_rules` (
    `id` VARCHAR(191) NOT NULL,
    `vehicleTypeId` VARCHAR(191) NOT NULL,
    `tripType` ENUM('LOCAL', 'OUTSTATION', 'AIRPORT_TRANSFER', 'ONE_WAY', 'ROUND_TRIP', 'FULL_DAY_RENTAL', 'CUSTOM') NOT NULL,
    `baseFare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `perKmRate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `perHourRate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `driverAllowanceDay` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `nightChargeMultiplier` DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
    `extraKmRate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `airportSurcharge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `statePermitCharge` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pricing_rules_vehicleTypeId_idx`(`vehicleTypeId`),
    UNIQUE INDEX `pricing_rules_vehicleTypeId_tripType_key`(`vehicleTypeId`, `tripType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `tax_configs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tax_configs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cgstRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `sgstRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `igstRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tax_configs_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `notifications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REJECTED', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_ON_THE_WAY', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'PAYMENT_RECEIVED', 'INVOICE_GENERATED', 'DOCUMENT_EXPIRY', 'SUPPORT_REPLY', 'SYSTEM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `support_tickets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `category` ENUM('BOOKING', 'PAYMENT', 'DRIVER', 'VEHICLE', 'ACCOUNT', 'OTHER') NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `assignedTo` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_tickets_ticketNumber_key`(`ticketNumber`),
    INDEX `support_tickets_userId_idx`(`userId`),
    INDEX `support_tickets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `support_messages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_messages` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderRole` ENUM('CUSTOMER', 'DRIVER', 'ADMIN') NOT NULL,
    `message` TEXT NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_messages_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `audit_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userRole` ENUM('CUSTOMER', 'DRIVER', 'ADMIN') NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `system_settings`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    INDEX `system_settings_key_idx`(`key`),
    INDEX `system_settings_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Foreign Keys
ALTER TABLE `customer_profiles` ADD CONSTRAINT `customer_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `driver_profiles` ADD CONSTRAINT `driver_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `driver_profiles` ADD CONSTRAINT `driver_profiles_assignedVehicleId_fkey` FOREIGN KEY (`assignedVehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `vehicle_documents` ADD CONSTRAINT `vehicle_documents_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `booking_status_history` ADD CONSTRAINT `booking_status_history_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `trips` ADD CONSTRAINT `trips_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `trips` ADD CONSTRAINT `trips_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driver_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `trips` ADD CONSTRAINT `trips_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pricing_rules` ADD CONSTRAINT `pricing_rules_vehicleTypeId_fkey` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------
-- Seed Data
-- -----------------------------------------------------

-- Create Default Admin User
-- Email: admin@mailaritravels.com | Password: password123 | Hash created using bcrypt round 10
INSERT INTO `users` (`id`, `email`, `mobile`, `passwordHash`, `authProvider`, `role`, `status`, `emailVerified`, `createdAt`, `updatedAt`) 
VALUES ('admin-uuid-1', 'admin@mailaritravels.com', '9876543210', '$2a$10$wE0rM8yP/oR6rQO5aE.Uo.fP0O0e0oW9bQ8vR4M8xW9v0.oU.oR0.', 'LOCAL', 'ADMIN', 'ACTIVE', true, NOW(), NOW());

-- Add Settings
INSERT INTO `system_settings` (`id`, `key`, `value`, `label`, `category`, `description`, `createdAt`, `updatedAt`) VALUES 
('setting-uuid-1', 'company_name', 'Mailari Travels', 'Company Name', 'general', 'Official company name displayed on website', NOW(), NOW()),
('setting-uuid-2', 'company_phone', '+91 9999999999', 'Company Phone', 'general', 'Official contact phone number', NOW(), NOW()),
('setting-uuid-3', 'company_email', 'contact@mailaritravels.com', 'Company Email', 'general', 'Official contact email', NOW(), NOW()),
('setting-uuid-4', 'invoice_prefix', 'MT-INV', 'Invoice Prefix', 'billing', 'Prefix used for generating invoice numbers', NOW(), NOW()),
('setting-uuid-5', 'currency', 'INR', 'Currency', 'billing', 'Default currency used across the system', NOW(), NOW());

-- Add Vehicle Types
INSERT INTO `vehicle_types` (`id`, `name`, `description`, `seatingCapacity`, `luggageCapacity`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`) VALUES 
('vtype-uuid-1', 'Sedan (Swift Dzire)', 'Comfortable 4-seater for city/outstation rides', 4, 2, true, 1, NOW(), NOW()),
('vtype-uuid-2', 'SUV (Ertiga / Innova)', 'Spacious 6-seater for family trips', 6, 4, true, 2, NOW(), NOW()),
('vtype-uuid-3', 'Tempo Traveller', 'Large vehicle for group tours (12+ seats)', 12, 10, true, 3, NOW(), NOW());

SET FOREIGN_KEY_CHECKS=1;
