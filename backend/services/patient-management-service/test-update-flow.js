import axios from 'axios';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import sequelize from './src/config/database.js';

const PATIENT_SERVICE_URL = 'http://localhost:6001/api/v1/patients';
const TEST_EMAIL = 'it23772922@my.sliit.lk';

const payload = { id: 999, email: 'test-admin@docapp.com', role: 'admin' };
const token = jwt.sign(payload, process.env.JWT_SECRET || '8f3d2c1b9e7a6c5b4d3f2a1e0b9c8d7f6a5e4d3c2b1a0f9e8d7c6b5a4e3f2d1', { expiresIn: '1h' });

async function testUpdateFlow() {
    console.log('--- Patient Update Flow Test ---');

    try {
        // 1. Find the patient we created in previous tests
        const [patients] = await sequelize.query(`SELECT id FROM patients WHERE email = '${TEST_EMAIL}' LIMIT 1`);
        
        if (patients.length === 0) {
            console.error('❌ No patient found with email:', TEST_EMAIL);
            console.log('Please run test-creation-flow.js first.');
            return;
        }

        const patientId = patients[0].id;
        console.log(`✅ Found Patient with ID: ${patientId}`);

        // 2. Perform Update via API
        const updateData = {
            full_name: 'Lakni Updated Name',
            address: 'New Update Address, Colombo',
            emergency_contact: '+94760000000'
        };

        console.log('\n--- [ACTION] Updating Patient via Service... ---');
        const response = await axios.put(`${PATIENT_SERVICE_URL}/${patientId}`, updateData, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            console.log('✅ Patient record updated successfully.');
            console.log('Response:', JSON.stringify(response.data, null, 2));

            // 3. Verify in DB
            const [updatedPatients] = await sequelize.query(`SELECT full_name, address FROM patients WHERE id = ${patientId}`);
            if (updatedPatients[0].full_name === updateData.full_name) {
                console.log('✅ Database verification: Name matches update!');
            } else {
                console.error('❌ Database verification: Name does NOT match!');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    } finally {
        await sequelize.close();
    }
}

testUpdateFlow();
