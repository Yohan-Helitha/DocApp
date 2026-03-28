import db from '../config/db.js';

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
      [adminUserId, 'user_status_change', 'user', userId, `Changed status to ${status}`]
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
  // Relies on users table with role=doctor and account_status=pending_verification
  const result = await db.query(
    'SELECT user_id as doctor_id, email, account_status, created_at FROM users WHERE role = $1 AND account_status = $2 ORDER BY created_at ASC',
    ['doctor', 'pending_verification']
  );
  return result.rows || [];
};

export const verifyDoctor = async ({ doctorId, approved, reason, adminUserId }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const newStatus = approved ? 'active' : 'disabled';

    const updateRes = await client.query(
      'UPDATE users SET account_status = $1, updated_at = now() WHERE user_id = $2 AND role = $3 RETURNING user_id, email, role, account_status, updated_at',
      [newStatus, doctorId, 'doctor']
    );

    if (updateRes.rowCount === 0) {
      const err = new Error('doctor_not_found');
      err.status = 404;
      throw err;
    }

    await client.query(
      'INSERT INTO doctor_verification_reviews (doctor_id, reviewed_by_admin_id, review_status, reason) VALUES ($1, $2, $3, $4)',
      [doctorId, adminUserId, approved ? 'approved' : 'rejected', reason || null]
    );

    await client.query(
      'INSERT INTO admin_actions (admin_user_id, action_type, target_entity, target_entity_id, action_note) VALUES ($1, $2, $3, $4, $5)',
      [adminUserId, 'verify_doctor', 'doctor', doctorId, approved ? 'Doctor approved' : 'Doctor rejected']
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
