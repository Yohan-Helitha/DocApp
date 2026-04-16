import 'dotenv/config';
import { sendEmail, sendSMS } from './src/services/notificationService.js';

async function testProviderDelivery() {
  try {
    console.log('--- Provider Delivery Test (External API calls) ---');

    console.log('\n--- 1. Testing Email Delivery (Resend) ---');
    console.log(`Sending from: ${process.env.RESEND_FROM_EMAIL}`);
    // NOTE: If using the default resend.dev domain, you can only send to the email you signed up with.
    const emailTo = 'it23772922@my.sliit.lk'; // Change this to your registered email if different
    
    try {
      await sendEmail(
        emailTo,
        'DocApp Live Delivery Test',
        'Hello! This is a real test from your DocApp Notification Service.',
        '<h1>DocApp Live Test</h1><p>The <b>Resend</b> integration is working correctly!</p>',
        'TEST_CODE',
        { patient_name: 'Lakni' }
      );
      console.log(`✅ Email sent request finished for: ${emailTo}`);
    } catch (e) {
      console.error('❌ Email Delivery Failed:', e.message);
      if (e.response) console.error(e.response.data);
    }

    console.log('\n--- 2. Testing SMS Delivery (Twilio) ---');
    console.log(`Sending from: ${process.env.TWILIO_PHONE_NUMBER}`);
    const smsTo = '+94721412930'; // Your phone number from context/tests
    
    try {
      await sendSMS(
        smsTo,
        'DocApp SMS Test: Your Twilio integration is working! - From DocApp Team',
        'SMS_TEST',
        { name: 'Admin' }
      );
      console.log(`✅ SMS sent request finished for: ${smsTo}`);
    } catch (e) {
      console.error('❌ SMS Delivery Failed:', e.message);
      if (e.response) console.error(e.response.data);
    }

    console.log('\n--- Test Completed ---');
    console.log('Check your email inbox (and spam) and your phone for the messages.');
    
    // Give it a moment for async logs if any
    setTimeout(() => process.exit(0), 2000);
  } catch (error) {
    console.error('❌ General Test Error:', error);
    process.exit(1);
  }
}

testProviderDelivery();