import { pool } from './src/config/db';
import { hashPassword } from './src/utils/password';
import { v4 as uuidv4 } from 'uuid';

const insertDemoUsers = async () => {
  try {
    const passwordHash = await hashPassword('password123');

    // ADMIN
    const adminId = uuidv4();
    await pool.execute(
      `INSERT INTO users (id, email, mobile, passwordHash, authProvider, role, status, emailVerified, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, 'LOCAL', 'ADMIN', 'ACTIVE', true, NOW(), NOW())`,
      [adminId, 'admin@mailaritravels.com', '9876543210', passwordHash]
    );
    console.log('✅ Admin user created: admin@mailaritravels.com / password123');

    // DRIVER
    const driverId = uuidv4();
    const driverProfileId = uuidv4();
    await pool.execute(
      `INSERT INTO users (id, email, mobile, passwordHash, authProvider, role, status, emailVerified, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, 'LOCAL', 'DRIVER', 'ACTIVE', true, NOW(), NOW())`,
      [driverId, 'driver@mailaritravels.com', '9876543211', passwordHash]
    );
    await pool.execute(
      `INSERT INTO driver_profiles (id, userId, fullName, licenceNumber, licenceExpiry, joiningDate, status, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 YEAR), NOW(), 'AVAILABLE', NOW(), NOW())`,
      [driverProfileId, driverId, 'Ramesh Kumar (Demo Driver)', 'DL1234567890']
    );
    console.log('✅ Driver user created: driver@mailaritravels.com / password123');

    // CUSTOMER
    const customerId = uuidv4();
    const customerProfileId = uuidv4();
    await pool.execute(
      `INSERT INTO users (id, email, mobile, passwordHash, authProvider, role, status, emailVerified, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, 'LOCAL', 'CUSTOMER', 'ACTIVE', true, NOW(), NOW())`,
      [customerId, 'customer@mailaritravels.com', '9876543212', passwordHash]
    );
    await pool.execute(
      `INSERT INTO customer_profiles (id, userId, fullName, createdAt, updatedAt) 
       VALUES (?, ?, ?, NOW(), NOW())`,
      [customerProfileId, customerId, 'John Doe (Demo Customer)']
    );
    console.log('✅ Customer user created: customer@mailaritravels.com / password123');

  } catch (error) {
    console.error('❌ Error inserting demo users:', error);
  } finally {
    await pool.end();
    process.exit();
  }
};

insertDemoUsers();
