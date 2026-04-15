// Seed demo users for local/k8s development.
// Run with: node seed-doctor.js

import bcrypt from 'bcryptjs';
import db from './src/config/db.js';
import env from './src/config/environment.js';

const SALT_ROUNDS = Number(env.BCRYPT_SALT_ROUNDS) || 10;

const demoUsers = [
  // Telemedicine demo doctor (must exist in BOTH authdb and doctorsdb)
  {
    user_id: '1300a38c-bbc4-46f3-8732-c789bf9f807d',
    email: 'dr.nimal.perera@docapp.local',
    password: 'Password123',
    role: 'doctor',
  },

  // Patient provided by you (ensures login works for seeding + UI testing)
  {
    email: 'yohan@gmail.com',
    password: 'Yohan@123',
    role: 'patient',
  },

  // Keep existing demo users (backward compatible)
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

async function upsertUser({ user_id, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // If a user_id is provided (seeded doctor), attempt to create with that UUID.
  // If the email already exists, we update credentials/status but keep the existing user_id.
  const insertColumns = user_id
    ? '(user_id, email, password_hash, role, account_status)'
    : '(email, password_hash, role, account_status)';
  const insertValues = user_id ? '($1, $2, $3, $4, \'active\')' : '($1, $2, $3, \'active\')';

  const params = user_id
    ? [user_id, email.toLowerCase(), passwordHash, role]
    : [email.toLowerCase(), passwordHash, role];

  const { rows } = await db.query(
    `INSERT INTO users ${insertColumns}
     VALUES ${insertValues}
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       account_status = 'active',
       updated_at = now()
     RETURNING user_id, email, role, account_status`,
    params,
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
