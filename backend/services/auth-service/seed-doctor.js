// Simple seeding script to create a doctor user directly via authService
// Run with: node backend/services/auth-service/seed-doctor.js

const authService = require('./src/services/authService');

async function main() {
  const email = 'doctor1@example.com';
  const password = 'Password123';

  try {
    const result = await authService.register({ email, password, role: 'doctor' });
    // eslint-disable-next-line no-console
    console.log('Seeded doctor user:', result.user || result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed doctor user:', err.message || err);
    process.exitCode = 1;
  }
}

main();
