-- 004_booking_geo.sql
-- Bookings previously stored only plain-text pickup/drop addresses with no
-- coordinates, which also meant estimatedDistance could never be computed
-- automatically. Adds real lat/lng so the booking flow can call a routing
-- service for distance/duration instead of leaving fare distance charges at
-- zero.

ALTER TABLE `bookings`
    ADD COLUMN `pickupLat` DECIMAL(10, 7) NULL AFTER `pickupLocation`,
    ADD COLUMN `pickupLng` DECIMAL(10, 7) NULL AFTER `pickupLat`,
    ADD COLUMN `dropLat` DECIMAL(10, 7) NULL AFTER `dropLocation`,
    ADD COLUMN `dropLng` DECIMAL(10, 7) NULL AFTER `dropLat`;
