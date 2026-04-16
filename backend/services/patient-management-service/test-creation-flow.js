import 'dotenv/config';
import sequelize from './src/config/database.js';
import { Patient } from './src/models/patientModel.js';
import axios from 'axios';
import patientService from './src/services/patientService.js';

// IMPORTANT: This test requires both Patient and Notification services to be running.
async function testPatientCreationFlow() {
  try {
    console.log('--- Patient Creation & Notification Flow Test ---');

    // 1. Database Connection
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 2. Setup Test Data
    const testEmail = 'it23772922@my.sliit.lk'; // Your verified Resend email
    const testPhone = '+94721412930';        // Your verified Twilio phone
    const testName = 'Lakni Test Flow';

    // 3. Cleanup existing test patient to prevent duplicate errors
    console.log(`Cleaning up existing entries for ${testEmail}...`);
    await Patient.destroy({ where: { email: testEmail } });

    // 4. Create Patient using Service logic (this triggers dual notifications)
    console.log('\n--- [ACTION] Creating Patient via Service... ---');
    const result = await patientService.createPatient({
      user_id: 888,
      full_name: testName,
      email: testEmail,
      phone: testPhone,
      dob: '1995-05-05',
      gender: 'Female',
      address: 'SLIIT Campus, Malabe',
      emergency_contact_name: 'Admin',
      emergency_contact_phone: '+94000000000'
    }, { id: 'test-admin-id', role: 'admin' });

    console.log('✅ Patient record created in DB with ID:', result.id);
    console.log('✅ Request successfully sent to Notification Service.');
    console.log('\n--- SUCCESS ---');
    console.log('Instructions:');
    console.log('1. Check your email (it23772922@my.sliit.lk)');
    console.log('2. Check your phone SMS (+94721412930)');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Flow Failed:');
    if (error.response) {
        console.error('Error from Notification Service:', error.response.status, error.response.data);
    } else {
        console.error(error.message);
    }
    process.exit(1);
  }
}

testPatientCreationFlow();