-- 005_notification_deliveries.sql
-- Tracks every outbound WhatsApp/email send attempt separately from the
-- in-app `notifications` table (which is just the bell-icon inbox). Lets
-- the app be honest about delivery: a missing provider config or a failed
-- API call is recorded as such instead of being reported as "sent".

CREATE TABLE `notification_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('WHATSAPP', 'EMAIL') NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `templateName` VARCHAR(191) NOT NULL,
    `status` ENUM('SENT', 'FAILED', 'UNAVAILABLE') NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 1,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_deliveries_channel_idx`(`channel`),
    INDEX `notification_deliveries_status_idx`(`status`),
    INDEX `notification_deliveries_entity_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
