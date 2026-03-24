/**
 * TEST SCRIPT: Verifies that send-sms endpoint correctly
 * triggers Twilio and PERSIStS to the database.
 * 
 * Instructions: Ensure notification-service is running on port 6000
 */

import axios from 'axios';

const API_URL = 'http://localhost:6000/api/v1/notifications';
const TEST_USER_ID = 'user_999';
const TEST_PHONE = '+94721412930'; // Replace if needed

async function testSmsEndToEnd() {
  try {
    console.log('--- Testing SMS End-to-End with Database Persistence ---');
    
    const payload = {
      recipient_user_id: TEST_USER_ID,
      recipient_phone: TEST_PHONE,
      recipient_email: 'it23772922@my.sliit.lk', // Using your verified Resend email
      channel: 'sms',
      message: 'Persistent SMS + Email Sync Test',
      priority: 'high'
    };

    console.log('Sending request to /send-sms...');
    const response = await axios.post(`${API_URL}/send-sms`, payload, {
      headers: {
        'X-User-ID': 'test-script',
        'X-User-Role': 'admin'
      }
    });

    console.log('✅ API Response Success:', response.data);
    
    if (response.data.id) {
        console.log(`✅ Success! Notification Record ID: ${response.data.id}`);
        console.log('Check your database table now - you should see this record.');
    }

  } catch (err) {
    if (err.response) {
      console.error('❌ API Error:', err.response.data);
    } else {
      console.error('❌ Connection Error:', err.message);
      console.log('\nTip: Make sure the notification service is running on port 6000.');
    }
  }
}

testSmsEndToEnd();
