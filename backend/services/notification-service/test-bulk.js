import axios from 'axios';

const API_URL = 'http://localhost:6000/api/v1/notifications';

const testBulkNotifications = async () => {
    try {
        console.log('--- Testing Bulk SMS Notification ---');
        const smsResponse = await axios.post(`${API_URL}/send-bulk`, {
            recipients: [101, 102], // Dummy user IDs
            channel: 'sms',
            message: 'Bulk Test: Hello from DocApp!',
            priority: 'normal'
        }, {
            headers: {
                'X-User-ID': 'admin-01',
                'X-User-Role': 'admin'
            }
        });
        console.log('SMS Bulk Result:', smsResponse.data);

        console.log('\n--- Testing Bulk Email Notification ---');
        const emailResponse = await axios.post(`${API_URL}/send-bulk`, {
            recipients: [201, 202, 203],
            channel: 'email',
            template_code: 'WELCOME_USER',
            payload_json: { name: 'Valued User', role: 'Patient' },
            priority: 'high'
        }, {
            headers: {
                'X-User-ID': 'admin-01',
                'X-User-Role': 'admin'
            }
        });
        console.log('Email Bulk Result:', emailResponse.data);

    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
    }
};

testBulkNotifications();
