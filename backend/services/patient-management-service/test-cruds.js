import 'dotenv/config';
import sequelize from './src/config/database.js';
import { Patient } from './src/models/patientModel.js';

async function testPatientCRUDS() {
  try {
    console.log('--- Patient Management CRUD Test ---');

    // 1. Authenticate & Sync
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 2. Cleanup Duplicates (Email and Phone)
    const testEmail = 'it23772922@my.sliit.lk';
    const testPhone = '+94721412930';

    console.log(`Checking for existing patients with email: ${testEmail} or phone: ${testPhone}...`);
    
    // Deleting any existing entries to ensure a clean test
    const deletedCount = await Patient.destroy({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: testEmail },
          { phone: testPhone }
        ]
      }
    });

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} existing duplicate entry/entries.`);
    } else {
      console.log('✅ No duplicates found. Proceeding with clean test.');
    }

    // 3. CREATE
    console.log('\n--- [CREATE] ---');
    const newPatient = await Patient.create({
      user_id: 101,
      full_name: 'Test Patient Sequelize',
      email: testEmail,
      phone: testPhone,
      dob: '1990-01-01',
      gender: 'Other',
      address: '123 Test Street, Colombo',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '+94770000000'
    });
    console.log('✅ Patient created with ID:', newPatient.id);

    // 4. READ
    console.log('\n--- [READ] ---');
    const foundPatient = await Patient.findByPk(newPatient.id);
    if (foundPatient) {
      console.log('✅ Successfully retrieved patient:', foundPatient.full_name);
    } else {
      throw new Error('❌ Failed to retrieve created patient.');
    }

    // 5. UPDATE
    console.log('\n--- [UPDATE] ---');
    await foundPatient.update({
        full_name: 'Updated Test Patient',
        address: '456 Updated Lane, Kandy'
    });
    const updatedPatient = await Patient.findByPk(newPatient.id);
    console.log('✅ Patient updated. New Name:', updatedPatient.full_name);

    // 6. DELETE
    console.log('\n--- [DELETE] ---');
    await updatedPatient.destroy();
    const checkDeleted = await Patient.findByPk(newPatient.id);
    if (!checkDeleted) {
      console.log('✅ Patient deleted successfully (Cleanup confirmed).');
    } else {
      throw new Error('❌ Patient still exists after deletion attempt.');
    }

    console.log('\n--- All CRUD Operations Passed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ CRUD Test Failed:');
    console.error(error);
    process.exit(1);
  }
}

testPatientCRUDS();