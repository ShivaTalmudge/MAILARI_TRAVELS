-- 002_payment_qr.sql
-- Admin-managed UPI/QR payment configuration, and a record of which driver
-- collected a given UPI payment. Old payment_qr_configs rows are kept
-- (deactivated, not deleted) so this table also serves as the QR change
-- history required for financial audit.

CREATE TABLE `payment_qr_configs` (
    `id` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `upiId` VARCHAR(191) NOT NULL,
    `qrImageUrl` VARCHAR(191) NOT NULL,
    `instructions` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_qr_configs_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_qr_configs`
    ADD CONSTRAINT `payment_qr_configs_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `payment_qr_configs_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payments`
    ADD COLUMN `collectedBy` VARCHAR(191) NULL AFTER `transactionRef`,
    ADD INDEX `payments_collectedBy_idx`(`collectedBy`),
    ADD CONSTRAINT `payments_collectedBy_fkey` FOREIGN KEY (`collectedBy`) REFERENCES `driver_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
