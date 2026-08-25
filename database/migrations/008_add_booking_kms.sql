-- Migration: 008_add_booking_kms
-- Description: Adds startKm and endKm to the bookings table.

ALTER TABLE `bookings`
ADD COLUMN `startKm` DECIMAL(10, 2) NULL,
ADD COLUMN `endKm` DECIMAL(10, 2) NULL;
