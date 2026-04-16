import axios from 'axios';

const BASE_URL = 'http://localhost:6001/api/v1/patients';

const testPatientService = async () => {
    try {
        console.log('--- Testing Patient Management Service ---');

        // 0. Set Token (Update this with the token from generate-token.js)
        const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTk5LCJlbWFpbCI6InRlc3QtYWRtaW5AZG9jYXBwLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NDQ1NDM1NSwiZXhwIjoxNzc0NDU3OTU1fQ.sLnp5iM8jThP21jQPf9KR0Nuhi8CSBAGAspDmndAysY';
        const headers = { Authorization: `Bearer ${TOKEN}` };

        // 1. Create Patient
        console.log('\n1. Creating a patient...');
        const uniqueSuffix = Date.now();
        const createRes = await axios.post(BASE_URL, {
            user_id: Math.floor(Math.random() * 1000000), 
            first_name: 'Test',
            last_name: 'Patient',
            email: `testpatient${uniqueSuffix}@example.com`,
            phone: '+94721412930',
            dob: '1990-01-01',
            gender: 'Male',
            address: '123 Test St',
            emergency_contact_name: 'Emergency',
            emergency_contact_phone: '0987654321'
        }, { headers });
        const patientId = createRes.data.id;
        console.log('✅ Patient created with ID:', patientId);

        // 2. Get Patient
        console.log('\n2. Retrieving patient...');
        const getRes = await axios.get(`${BASE_URL}/${patientId}`, { headers });
        console.log('✅ Patient data:', getRes.data.full_name);

        // 3. Update Patient
        console.log('\n3. Updating patient...');
        await axios.put(`${BASE_URL}/${patientId}`, {
            phone: '9999999999'
        }, { headers });
        console.log('✅ Patient updated.');

        // 4. Upload Report
        console.log('\n4. Uploading medical report...');
        await axios.post(`${BASE_URL}/${patientId}/medical-reports`, {
            report_name: 'Blood Test',
            file_url: 'http://storage.com/reports/blood-test.pdf',
            notes: 'Annual checkup blood test'
        }, { headers });
        console.log('✅ Report uploaded.');

        // 5. Get History/Prescriptions
        console.log('\n5. Getting medical history...');
        const historyRes = await axios.get(`${BASE_URL}/${patientId}/medical-history`, { headers });
        console.log('✅ Medical history count:', historyRes.data.length);

        console.log('\n--- All tests completed successfully! ---');
    } catch (err) {
        console.error('❌ Test failed:', err.response ? err.response.data : err.message);
    }
};

testPatientService();