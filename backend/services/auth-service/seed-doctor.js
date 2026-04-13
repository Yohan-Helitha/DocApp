// Simple seeding script to create a doctor user directly via authService
// Run with: node backend/services/auth-service/seed-doctor.js

import { register } from './src/services/authService.js';

async function main() {
  const email = 'doctor1@example.com';
  const password = 'Password123';

  try {
    const result = await register({ email, password, role: 'doctor' });
    // eslint-disable-next-line no-console
    console.log('Seeded doctor user:', result.user || result);
  } catch (err) {
    // If the user already exists, treat seeding as successful.
    if (err && (err.message === 'email_exists' || err.status === 409)) {
      // eslint-disable-next-line no-console
      console.log('Doctor user already seeded:', email);
      return;
    }
    // eslint-disable-next-line no-console
    console.error('Failed to seed doctor user:', err.message || err);
    process.exitCode = 1;
  }
}

main();
