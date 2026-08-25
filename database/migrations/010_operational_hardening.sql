-- Migration: 010_operational_hardening
-- Description: Adds idempotency_keys table for safely retrying critical operations

CREATE TABLE IF NOT EXISTS `idempotency_keys` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `requestPath` VARCHAR(255) NOT NULL,
    `requestMethod` VARCHAR(10) NOT NULL,
    `responseStatus` INTEGER NULL,
    `responseBody` JSON NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `idempotency_key_user_idx` (`idempotencyKey`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
