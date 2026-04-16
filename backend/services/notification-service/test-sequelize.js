import 'dotenv/config';
import sequelize from './src/config/database.js';
import Notification from './src/models/notificationModel.js';

async function testSequelize() {
  try {
    console.log('--- Sequelize Connection & Model Test ---');
    
    // 1. Authenticate
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');

    // 2. Sync (Safe sync - won't drop tables if they exist)
    // NOTE: In production, use migrations. This is just for testing.
    await sequelize.sync();
    console.log('✅ Models synced with database.');

    // 3. Create a test record
    const testNote = await Notification.create({
      recipient_user_id: 999,
      channel: 'email',
      message: 'This is a Sequelize test notification',
      priority: 'low',
      status: 'PENDING',
      payload_json: { subject: 'Test Subject', test: true }
    });
    console.log('✅ Test notification created successfully with ID:', testNote.id);

    // 4. Read the record back
    const foundNote = await Notification.findByPk(testNote.id);
    console.log('✅ Successfully retrieved notification from DB:', foundNote.message);

    // 5. Delete the test record (Cleanup)
    await foundNote.destroy();
    console.log('✅ Test notification deleted (Cleanup successful).');

    process.exit(0);
  } catch (error) {
    console.error('❌ Sequelize Test Failed:');
    console.error(error);
    process.exit(1);
  }
}

testSequelize();