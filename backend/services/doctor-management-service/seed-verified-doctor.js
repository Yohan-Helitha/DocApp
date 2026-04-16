// Seed a doctor that is verified in doctor-management-service and has availability slots.
// NOTE: Pair this with auth-service seed (auth-service/seed-doctor.js) which seeds the same user_id.
// Run with: node seed-verified-doctor.js

import db from './src/config/db.js';

const VERIFIED_DOCTOR_USER_ID = '3f9f7f64-7df5-4c1d-9b70-3a7fbbab3b2a';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDb({ attempts = 30, delayMs = 2000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      await db.query('SELECT 1');
      return;
    } catch {
      await sleep(delayMs);
    }
  }
  throw new Error('db_not_ready');
}

function toIsoDate(d) {
  // Use UTC to avoid local timezone rollovers.
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return dt.toISOString().slice(0, 10);
}

async function upsertVerifiedDoctor() {
  const doctorId = VERIFIED_DOCTOR_USER_ID;
  const userId = VERIFIED_DOCTOR_USER_ID;

  const { rows } = await db.query(
    `INSERT INTO doctors (
       doctor_id, user_id, email, full_name, specialization, license_number,
       experience_years, consultation_fee, bio, verification_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved')
     ON CONFLICT (doctor_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       specialization = EXCLUDED.specialization,
       license_number = EXCLUDED.license_number,
       experience_years = EXCLUDED.experience_years,
       consultation_fee = EXCLUDED.consultation_fee,
       bio = EXCLUDED.bio,
       verification_status = 'approved',
       updated_at = now()
     RETURNING doctor_id, user_id, email, full_name, specialization, verification_status`,
    [
      doctorId,
      userId,
      'verified.doctor@example.com',
      'Dr. Verified Seed',
      'General Medicine',
      'LIC-SEED-VERIFIED-001',
      8,
      1500,
      'Seeded doctor (verified) with availability slots.'
    ]
  );

  return rows?.[0] || null;
}

async function seedAvailabilitySlots() {
  const doctorId = VERIFIED_DOCTOR_USER_ID;

  // Non-destructive idempotency: if slots already exist, keep them.
  const existingCountRes = await db.query(
    'SELECT COUNT(*)::int AS count FROM doctor_availability_slots WHERE doctor_id = $1',
    [doctorId]
  );
  const existingCount = Number(existingCountRes.rows?.[0]?.count || 0);
  if (existingCount > 0) {
    const { rows } = await db.query(
      'SELECT slot_id, slot_date, start_time, end_time, slot_status FROM doctor_availability_slots WHERE doctor_id = $1 ORDER BY slot_date, start_time',
      [doctorId]
    );
    return rows || [];
  }

  const now = new Date();
  const dates = [0, 1, 2].map((addDays) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + addDays);
    return toIsoDate(d);
  });

  const slots = [];
  for (const date of dates) {
    slots.push({ slot_date: date, start_time: '09:00:00', end_time: '10:00:00' });
    slots.push({ slot_date: date, start_time: '10:30:00', end_time: '11:30:00' });
    slots.push({ slot_date: date, start_time: '14:00:00', end_time: '15:00:00' });
  }

  for (const s of slots) {
    await db.query(
      `INSERT INTO doctor_availability_slots (doctor_id, slot_date, start_time, end_time)
       VALUES ($1, $2, $3, $4)`,
      [doctorId, s.slot_date, s.start_time, s.end_time]
    );
  }

  const { rows } = await db.query(
    'SELECT slot_id, slot_date, start_time, end_time, slot_status FROM doctor_availability_slots WHERE doctor_id = $1 ORDER BY slot_date, start_time',
    [doctorId]
  );
  return rows || [];
}

async function main() {
  try {
    await waitForDb();

    const doctor = await upsertVerifiedDoctor();
    // eslint-disable-next-line no-console
    console.log('Seeded verified doctor profile:', doctor);

    const slots = await seedAvailabilitySlots();
    // eslint-disable-next-line no-console
    console.log(`Seeded ${slots.length} availability slots for doctor_id=${VERIFIED_DOCTOR_USER_ID}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to seed verified doctor:', err && err.message ? err.message : err);
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
