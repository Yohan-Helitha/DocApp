import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://127.0.0.1:6001/api/v1/patients'; // Patient Service (Port 6001)
const NOTIFICATION_API_URL = 'http://127.0.0.1:6000/api/v1/notifications'; // Notification Service

/**
 * This test verifies the end-to-end flow:
 * 1. Register a new patient via Patient Management Service.
 * 2. Check if the Patient Service successfully calls the Notification Service.
 * 3. Verify the notification exists in the Notification Service database/API.
 */
async function testNotificationIntegration() {
    console.log('--- Testing Patient Registration Notification Flow ---');

    // 1. Generate a unique email and user_id for this test
    const timestamp = Date.now();
    const testPatient = {
        user_id: 1000 + (timestamp % 10000),
        full_name: `Notify Test Patient ${timestamp}`,
        email: 'it23772922@my.sliit.lk',
        phone: '+94721412930',
        dob: '1995-01-01',
        gender: 'Male',
        address: '123 Test Ave, Colombo',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0777654321'
    };

    // Use a mock token (ensure your middleware accepts this or use a real one from auth-service)
    const headers = {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTk5LCJlbWFpbCI6InRlc3QtYWRtaW5AZG9jYXBwLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NDQ1NTQ1MywiZXhwIjoxNzc0NDU5MDUzfQ.xrXLeHWVLJiTzD3gux82Ooa-UiOnGMcENtSFIt7xIGY', 
        'x-user-id': '999',
        'x-user-role': 'admin',
        'Content-Type': 'application/json'
    };

    try {
        // STEP 1: Register the Patient
        console.log(`1. Registering patient: ${testPatient.full_name}...`);
        const regResponse = await axios.post(API_URL, testPatient, { headers });
        
        if (regResponse.status === 201) {
            console.log('✅ Patient registered successfully.');
            const patientId = regResponse.data.id;
            const userId = testPatient.user_id;

            // Wait a moment for the async notification processing (if any)
            console.log('Waiting for notification processing...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // STEP 2: Verify Notification in Notification Service
            // We search for notifications sent to this specific user_id
            console.log(`2. Verifying notification for user_id: ${userId}...`);
            const notifResponse = await axios.get(`${NOTIFICATION_API_URL}/user/${userId}`, {
                headers: {
                    'x-user-id': 'system-test',
                    'x-user-role': 'admin'
                }
            });

            if (notifResponse.status === 200 && notifResponse.data.length > 0) {
                const latestNotif = notifResponse.data[0];
                console.log('✅ Notification found in Notification Service!');
                console.log('--- Notification Details ---');
                console.log(`ID: ${latestNotif.id}`);
                console.log(`Recipient: ${latestNotif.recipient_user_id}`);
                console.log(`Message: ${latestNotif.message}`);
                console.log(`Status: ${latestNotif.status}`);
                console.log('----------------------------');
                console.log('RESULT: PASS');
            } else {
                console.error('❌ Notification NOT found for the registered user.');
                if (notifResponse.data.length === 0) {
                    console.log('Empty list returned from Notification Service.');
                }
                console.log('RESULT: FAIL');
            }
        }
    } catch (error) {
        console.error('❌ Test failed with error:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        console.log('RESULT: ERROR');
    }
}

testNotificationIntegration();
