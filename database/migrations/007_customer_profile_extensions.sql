-- Migration: 007_customer_profile_extensions
-- Description: Adds missing customer profile fields (photoUrl, emergencyContactName, emergencyContactNumber, preferredLanguage, savedPassengers).

ALTER TABLE `customer_profiles` 
ADD COLUMN `photoUrl` VARCHAR(500) NULL,
ADD COLUMN `emergencyContactName` VARCHAR(191) NULL,
ADD COLUMN `emergencyContactNumber` VARCHAR(20) NULL,
ADD COLUMN `preferredLanguage` VARCHAR(20) NOT NULL DEFAULT 'en',
ADD COLUMN `savedPassengers` JSON NULL;
