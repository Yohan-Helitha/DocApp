import twilioClient from './src/config/twilio.js';
import dotenv from 'dotenv';

dotenv.config();

const to = '+94721412930'; // The number from your snippet
const message = 'Hi from DocApp';

async function testTwilio() {
  try {
    console.log(`Attempting to send SMS to ${to}...`);
    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log('Success! Message SID:', response.sid);
  } catch (err) {
    console.error('Failed to send SMS:', err.message);
  }
}

testTwilio();
