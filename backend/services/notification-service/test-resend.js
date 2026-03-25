// test-resend.js
import 'dotenv/config'; // Loads variables from .env
import * as service from './src/services/notificationService.js';

console.log('Testing Resend Integration...');
console.log('Using API Key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
console.log('Using From Email:', process.env.RESEND_FROM_EMAIL);

const testEmail = async () => {
  try {
    const result = await service.sendEmail(
      'it23772922@my.sliit.lk', // 👈 CHANGE THIS to your actual email
      'Test Email - DocApp Service',
      'This is a plain text test from the notification service.',
      '<h1>DocApp Test</h1><p>Your Resend integration is <strong>working correctly!</strong></p>',
      'WELCOME_USER', // Testing the template system too
      { name: 'Developer', role: 'Tester' }
    );

    console.log('✅ Email sent successfully!');
    console.log('Response ID:', result.id);
  } catch (error) {
    console.error('❌ Failed to send email:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

testEmail();
