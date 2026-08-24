-- dev_demo_users.sql
-- DEVELOPMENT/STAGING ONLY. DO NOT RUN AGAINST A PRODUCTION DATABASE.
-- Creates demo admin/driver/customer accounts sharing the password
-- "password123" purely for local testing. Applied via `npm run db:seed:dev`,
-- which refuses to run when NODE_ENV=production.

SET FOREIGN_KEY_CHECKS=0;

-- Email: admin@mailaritravels.com | Password: password123
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `passwordHash`, `authProvider`, `role`, `status`, `emailVerified`, `createdAt`, `updatedAt`)
VALUES ('demo-admin-id', 'admin@mailaritravels.com', '9876543210', '$2a$12$3FI./owuj/XnAFpyhOrrbuFuxqGIMAF..dO2UKAbNppXsF6nW0Xd6', 'LOCAL', 'ADMIN', 'ACTIVE', true, NOW(), NOW());

-- Email: driver@mailaritravels.com | Password: password123
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `passwordHash`, `authProvider`, `role`, `status`, `emailVerified`, `createdAt`, `updatedAt`)
VALUES ('demo-driver-id', 'driver@mailaritravels.com', '9876543211', '$2a$12$3FI./owuj/XnAFpyhOrrbuFuxqGIMAF..dO2UKAbNppXsF6nW0Xd6', 'LOCAL', 'DRIVER', 'ACTIVE', true, NOW(), NOW());

INSERT IGNORE INTO `driver_profiles` (`id`, `userId`, `fullName`, `licenceNumber`, `licenceExpiry`, `joiningDate`, `status`, `createdAt`, `updatedAt`)
VALUES ('demo-driver-profile-id', 'demo-driver-id', 'Ramesh Kumar (Demo Driver)', 'DL1234567890', DATE_ADD(NOW(), INTERVAL 5 YEAR), NOW(), 'AVAILABLE', NOW(), NOW());

-- Email: customer@mailaritravels.com | Password: password123
INSERT IGNORE INTO `users` (`id`, `email`, `mobile`, `passwordHash`, `authProvider`, `role`, `status`, `emailVerified`, `createdAt`, `updatedAt`)
VALUES ('demo-customer-id', 'customer@mailaritravels.com', '9876543212', '$2a$12$3FI./owuj/XnAFpyhOrrbuFuxqGIMAF..dO2UKAbNppXsF6nW0Xd6', 'LOCAL', 'CUSTOMER', 'ACTIVE', true, NOW(), NOW());

INSERT IGNORE INTO `customer_profiles` (`id`, `userId`, `fullName`, `createdAt`, `updatedAt`)
VALUES ('demo-customer-profile-id', 'demo-customer-id', 'John Doe (Demo Customer)', NOW(), NOW());

SET FOREIGN_KEY_CHECKS=1;
