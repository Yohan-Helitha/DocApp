// Seed demo users for local/k8s development.
// Run with: node seed-doctor.js

import bcrypt from 'bcryptjs';
import db from './src/config/db.js';
import env from './src/config/environment.js';

const SALT_ROUNDS = Number(env.BCRYPT_SALT_ROUNDS) || 10;

const demoUsers = [
  { email: 'doctor1@example.com', password: 'Password123', role: 'doctor' },
  { email: 'patient2@example.com', password: 'Password123', role: 'patient' },
  { email: 'admin1@example.com', password: 'Password123', role: 'admin' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDb({ attempts = 30, delayMs = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      await db.query('SELECT 1');
      return;
    } catch (e) {
      // retry
      await sleep(delayMs);
    }
  }
  throw new Error('db_not_ready');
}

async function upsertUser({ email, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       account_status = 'active',
       updated_at = now()
     RETURNING user_id, email, role, account_status`,
    [email.toLowerCase(), passwordHash, role],
  );
  return rows && rows[0];
}

async function ensureDoctorVerificationApproved(userId) {
  await db.query(
    `INSERT INTO doctor_verification_requests (user_id, status, profile_data, submitted_at, reviewed_at, review_reason)
     VALUES ($1, 'approved', '{}'::jsonb, now(), now(), 'seeded')
     ON CONFLICT (user_id)
     DO UPDATE SET status = 'approved', reviewed_at = now(), review_reason = 'seeded'`,
    [userId],
  );
}

async function main() {
  try {
    await waitForDb();

    for (const user of demoUsers) {
      const upserted = await upsertUser(user);
      if (user.role === 'doctor' && upserted && upserted.user_id) {
        await ensureDoctorVerificationApproved(upserted.user_id);
      }
      // eslint-disable-next-line no-console
      console.log('Seeded demo user:', upserted);
    }

    // eslint-disable-next-line no-console
    console.log('Demo user seeding complete.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed demo users:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try {
      await db.pool.end();
    } catch {
      // ignore
    }
  }
}

main();
