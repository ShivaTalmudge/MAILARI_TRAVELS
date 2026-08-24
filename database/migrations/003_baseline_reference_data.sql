-- 003_baseline_reference_data.sql
-- Non-sensitive reference/config data a fresh install needs to function:
-- default vehicle types and system settings. No credentials or accounts —
-- unlike dev_demo_users.sql, this is safe to apply in production. Admin
-- should update the placeholder company details via Settings after go-live.
-- Uses INSERT IGNORE (keyed on the UNIQUE `name`/`key` columns) so re-running
-- this migration file is harmless.

INSERT IGNORE INTO `system_settings` (`id`, `key`, `value`, `label`, `category`, `description`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'company_name', 'Mailari Travels', 'Company Name', 'general', 'Official company name displayed on website', NOW(), NOW()),
(UUID(), 'company_phone', '+91 0000000000', 'Company Phone', 'general', 'Official contact phone number', NOW(), NOW()),
(UUID(), 'company_email', 'contact@mailaritravels.com', 'Company Email', 'general', 'Official contact email', NOW(), NOW()),
(UUID(), 'invoice_prefix', 'MT-INV', 'Invoice Prefix', 'billing', 'Prefix used for generating invoice numbers', NOW(), NOW()),
(UUID(), 'currency', 'INR', 'Currency', 'billing', 'Default currency used across the system', NOW(), NOW());

INSERT IGNORE INTO `vehicle_types` (`id`, `name`, `description`, `seatingCapacity`, `luggageCapacity`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'Sedan (Swift Dzire)', 'Comfortable 4-seater for city/outstation rides', 4, 2, true, 1, NOW(), NOW()),
(UUID(), 'SUV (Ertiga / Innova)', 'Spacious 6-seater for family trips', 6, 4, true, 2, NOW(), NOW()),
(UUID(), 'Tempo Traveller', 'Large vehicle for group tours (12+ seats)', 12, 10, true, 3, NOW(), NOW());
