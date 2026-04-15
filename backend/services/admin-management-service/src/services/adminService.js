import db from '../config/db.js';
import axios from 'axios';
import env from '../config/environment.js';

const SYSTEM_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000';

const authClient = axios.create({
  baseURL: (env.AUTH_SERVICE_BASE_URL || '').replace(/\/$/, ''),
  timeout: 10_000
});

// NOTE: This service operates on the shared Postgres DB used by Auth,
// using the auth schema's `users` table and the admin-specific tables
// defined in db/init.sql.

export const listUsers = async () => {
  const result = await db.query(
    'SELECT user_id, email, role, account_status, created_at, updated_at FROM users ORDER BY created_at DESC'
  );
  return result.rows || [];
};

export const updateUserStatus = async ({ userId, status, adminUserId }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updateRes = await client.query(
      'UPDATE users SET account_status = $1, updated_at = now() WHERE user_id = $2 RETURNING user_id, email, role, account_status, updated_at',
      [status, userId]
    );

    if (updateRes.rowCount === 0) {
      const err = new Error('user_not_found');
      err.status = 404;
      throw err;
    }

    await client.query(
      'INSERT INTO admin_actions (admin_user_id, action_type, target_entity, target_entity_id, action_note) VALUES ($1, $2, $3, $4, $5)',
      [adminUserId || SYSTEM_ADMIN_USER_ID, 'user_status_change', 'user', userId, `Changed status to ${status}`]
    );

    await client.query('COMMIT');
    return updateRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listPendingDoctors = async () => {
  if (!env.INTERNAL_API_KEY) {
    const err = new Error('internal_api_key_not_configured');
    err.status = 503;
    throw err;
  }

  const res = await authClient.get(
    '/api/v1/internal/auth/doctors/pending-verification',
    {
      headers: { 'x-internal-api-key': env.INTERNAL_API_KEY }
    }
  );

  const doctors = Array.isArray(res.data?.doctors) ? res.data.doctors : [];
  return doctors.map((d) => {
    const profile = d.profile_data || {};
    return {
      doctor_id: d.user_id,
      user_id: d.user_id,
      email: d.email,
      full_name: profile.full_name || null,
      specialization: profile.specialization || null,
      account_status: d.account_status,
      created_at: d.created_at,
      submitted_at: d.submitted_at,
      verification_status: d.verification_status
    };
  });
};

export const verifyDoctor = async ({ doctorId, approved, reason, adminUserId }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    if (!env.INTERNAL_API_KEY) {
      const err = new Error('internal_api_key_not_configured');
      err.status = 503;
      throw err;
    }

    const effectiveAdminUserId = adminUserId || SYSTEM_ADMIN_USER_ID;
    const status = approved ? 'approved' : 'rejected';
    const authRes = await authClient.put(
      `/api/v1/internal/auth/doctors/${doctorId}/verify`,
      { status, reason, adminUserId: adminUserId || null },
      { headers: { 'x-internal-api-key': env.INTERNAL_API_KEY } }
    );

    await client.query(
      'INSERT INTO doctor_verification_reviews (doctor_id, reviewed_by_admin_id, review_status, reason) VALUES ($1, $2, $3, $4)',
      [doctorId, effectiveAdminUserId, approved ? 'approved' : 'rejected', reason || null]
    );

    await client.query(
      'INSERT INTO admin_actions (admin_user_id, action_type, target_entity, target_entity_id, action_note) VALUES ($1, $2, $3, $4, $5)',
      [effectiveAdminUserId, 'verify_doctor', 'doctor', doctorId, approved ? 'Doctor approved' : 'Doctor rejected']
    );

    await client.query('COMMIT');
    return authRes.data?.user || { user_id: doctorId, account_status: approved ? 'active' : 'rejected' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listTransactions = async () => {
  // For simplicity, expose financial_monitoring_records as the admin view of transactions
  const result = await db.query(
    'SELECT record_id, transaction_id, appointment_id, amount, currency, status, flagged, flag_reason, created_at FROM financial_monitoring_records ORDER BY created_at DESC'
  );
  return result.rows || [];
};

export const listAuditLogs = async ({ limit = 100 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 500);
  const result = await db.query(
    'SELECT action_id, admin_user_id, action_type, target_entity, target_entity_id, action_note, created_at FROM admin_actions ORDER BY created_at DESC LIMIT $1',
    [safeLimit]
  );
  return result.rows || [];
};

export const getDashboardMetrics = async () => {
  const [userCountsRes, doctorReviewCountsRes, financialStatsRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'patient') AS patients,
         COUNT(*) FILTER (WHERE role = 'doctor') AS doctors,
         COUNT(*) FILTER (WHERE role = 'admin') AS admins,
         COUNT(*) AS total_users
       FROM users`
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE review_status = 'approved') AS doctors_approved,
         COUNT(*) FILTER (WHERE review_status = 'rejected') AS doctors_rejected,
         COUNT(*) AS total_reviews
       FROM doctor_verification_reviews`
    ),
    db.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_amount,
         COUNT(*) AS total_records,
         COUNT(*) FILTER (WHERE flagged) AS flagged_records
       FROM financial_monitoring_records`
    )
  ]);

  const userCounts = userCountsRes.rows[0] || {};
  const doctorReviewCounts = doctorReviewCountsRes.rows[0] || {};
  const financialStats = financialStatsRes.rows[0] || {};

  return {
    users: userCounts,
    doctorReviews: doctorReviewCounts,
    financials: financialStats
  };
};
