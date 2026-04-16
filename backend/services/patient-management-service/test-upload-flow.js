import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import sequelize from './src/config/database.js';

const PATIENT_SERVICE_URL = 'http://localhost:6001/api/v1/patients';
const TEST_EMAIL = 'it23772922@my.sliit.lk';
const payload = { id: 999, email: 'test-admin@docapp.com', role: 'admin' };
const token = jwt.sign(payload, process.env.JWT_SECRET || '8f3d2c1b9e7a6c5b4d3f2a1e0b9c8d7f6a5e4d3c2b1a0f9e8d7c6b5a4e3f2d1', { expiresIn: '1h' });

async function testUploadFlow() {
    console.log('--- Medical Report Upload Flow Test ---');

    try {
        // 1. Find the test patient
        const [patients] = await sequelize.query(`SELECT id FROM patients WHERE email = '${TEST_EMAIL}' LIMIT 1`);
        
        if (patients.length === 0) {
            console.error('❌ No patient found with email:', TEST_EMAIL);
            console.log('Please run test-creation-flow.js first.');
            return;
        }

        const patientId = patients[0].id;
        console.log(`✅ Found Patient with ID: ${patientId}`);

        // 2. Upload PDF
        console.log('\n--- [ACTION] Uploading PDF Report... ---');
        const pdfData = new FormData();
        pdfData.append('report_file', fs.createReadStream('./test-report.pdf'));
        pdfData.append('report_name', 'Annual Checkup PDF');

        const pdfResponse = await axios.post(`${PATIENT_SERVICE_URL}/${patientId}/medical-reports`, pdfData, {
            headers: {
                ...pdfData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✅ PDF Upload Success:', pdfResponse.data.file_url);

        // 3. Upload Image
        console.log('\n--- [ACTION] Uploading Image Report... ---');
        const imgData = new FormData();
        imgData.append('report_file', fs.createReadStream('./test-image.jpg'));
        imgData.append('report_name', 'X-Ray Image');

        const imgResponse = await axios.post(`${PATIENT_SERVICE_URL}/${patientId}/medical-reports`, imgData, {
            headers: {
                ...imgData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✅ Image Upload Success:', imgResponse.data.file_url);

        // 4. Verify in DB
        const [reports] = await sequelize.query(`SELECT report_name, file_type FROM medical_reports WHERE patient_id = ${patientId}`);
        console.log('\n--- Database Verification ---');
        console.log(`Reports found for patient: ${reports.length}`);
        reports.forEach(r => console.log(`- ${r.report_name} (${r.file_type})`));

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    } finally {
        await sequelize.close();
    }
}

testUploadFlow();
