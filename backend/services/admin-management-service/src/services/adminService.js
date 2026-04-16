import db from '../config/db.js';
import axios from 'axios';
import env from '../config/environment.js';

const SYSTEM_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000';

const authClient = axios.create({
  baseURL: (env.AUTH_SERVICE_BASE_URL || '').replace(/\/$/, ''),
  timeout: 10_000
});

const doctorClient = axios.create({
  baseURL: (env.DOCTOR_SERVICE_BASE_URL || '').replace(/\/$/, ''),
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

export const createAuditLog = async ({ actionType, targetEntity, targetEntityId, actionNote, adminUserId }) => {
  const { rows } = await db.query(
    'INSERT INTO admin_actions (admin_user_id, action_type, target_entity, target_entity_id, action_note) VALUES ($1, $2, $3, $4, $5) RETURNING action_id, admin_user_id, action_type, target_entity, target_entity_id, action_note, created_at',
    [adminUserId || SYSTEM_ADMIN_USER_ID, actionType, targetEntity, targetEntityId, actionNote || null]
  );
  return rows?.[0] || null;
};

export const listPendingDoctors = async () => {
  if (!env.INTERNAL_API_KEY) {
    const err = new Error('internal_api_key_not_configured');
    err.status = 503;
    throw err;
  }

  const allDoctorsRes = await authClient.get('/api/v1/internal/auth/doctors/verification-records', {
    headers: { 'x-internal-api-key': env.INTERNAL_API_KEY }
  });
  const authDoctors = Array.isArray(allDoctorsRes.data?.doctors) ? allDoctorsRes.data.doctors : [];

  const doctorStatusesRes = await doctorClient.get('/api/v1/internal/doctors/verification-statuses', {
    headers: { 'x-internal-api-key': env.INTERNAL_API_KEY }
  });
  const profileDoctors = Array.isArray(doctorStatusesRes.data?.doctors)
    ? doctorStatusesRes.data.doctors
    : [];

  const pendingByUserId = new Map(
    authDoctors
      .filter((d) => d && d.user_id)
      .map((d) => [d.user_id, d])
  );

  const profileByUserId = new Map(
    profileDoctors
      .filter((d) => d && d.user_id)
      .map((d) => [d.user_id, d])
  );

  const userIds = new Set();
  for (const d of authDoctors) {
    if (d?.user_id) userIds.add(d.user_id);
  }
  for (const d of profileDoctors) {
    if (d?.user_id) userIds.add(d.user_id);
  }

  return Array.from(userIds).map((userId) => {
    const authRow = pendingByUserId.get(userId) || null;
    const profileRow = profileByUserId.get(userId) || null;

    const authProfile = authRow?.profile_data || {};
    const submittedAt = authRow?.submitted_at || authRow?.created_at || profileRow?.created_at || null;

    const accountStatus = String(authRow?.account_status || 'pending_verification').toLowerCase();
    const loginVerificationStatus = accountStatus === 'pending_verification'
      ? 'pending'
      : (accountStatus === 'active' ? 'approved' : (accountStatus === 'rejected' ? 'rejected' : accountStatus));

    const profileVerificationStatus = profileRow
      ? String(profileRow.verification_status || 'pending').toLowerCase()
      : 'not_created';

    return {
      doctor_id: profileRow?.doctor_id || null,
      user_id: userId,
      email: authRow?.email || profileRow?.email || null,
      full_name: profileRow?.full_name || authProfile.full_name || null,
      specialization: profileRow?.specialization || authProfile.specialization || null,
      account_status: accountStatus,
      created_at: submittedAt,
      submitted_at: submittedAt,
      verification_status: profileVerificationStatus,
      login_verification_status: loginVerificationStatus,
      profile_verification_status: profileVerificationStatus,
      license_original_name: authRow?.license_original_name || null,
      license_mime_type: authRow?.license_mime_type || null,
      license_size_bytes: authRow?.license_size_bytes || null
    };
  });
};

export const getDoctorLicense = async ({ doctorId }) => {
  if (!env.INTERNAL_API_KEY) {
    const err = new Error('internal_api_key_not_configured');
    err.status = 503;
    throw err;
  }

  try {
    const res = await authClient.get(`/api/v1/internal/auth/doctors/${doctorId}/license`, {
      headers: { 'x-internal-api-key': env.INTERNAL_API_KEY },
      responseType: 'arraybuffer'
    });

    const mimeType = res.headers?.['content-type'] || 'application/pdf';
    const disposition = res.headers?.['content-disposition'] || '';
    const match = /filename\*?=([^;]+)/i.exec(disposition);
    const rawFilename = match ? match[1] : 'license.pdf';
    const filename = String(rawFilename).replace(/^UTF-8''/i, '').replace(/^"|"$/g, '').trim() || 'license.pdf';

    return { filename, mimeType, data: Buffer.from(res.data) };
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404) {
      const err = new Error('license_not_found');
      err.status = 404;
      throw err;
    }
    throw e;
  }
};

export const verifyDoctor = async ({ doctorId, approved, reason, adminUserId, step = 'all' }) => {
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
    const normalizedStep = String(step || 'all').toLowerCase();
    const applyLoginStep = normalizedStep === 'all' || normalizedStep === 'login';
    const applyProfileStep = normalizedStep === 'all' || normalizedStep === 'profile';

    let authUser = null;
    let profileDoctor = null;

    if (applyLoginStep) {
      const authRes = await authClient.put(
        `/api/v1/internal/auth/doctors/${doctorId}/verify`,
        { status, reason, adminUserId: adminUserId || null },
        { headers: { 'x-internal-api-key': env.INTERNAL_API_KEY } }
      );
      authUser = authRes.data?.user || null;
    }

    if (applyProfileStep) {
      try {
        const doctorRes = await doctorClient.put(
          `/api/v1/internal/doctors/${doctorId}/verification-status`,
          { status },
          { headers: { 'x-internal-api-key': env.INTERNAL_API_KEY } }
        );
        profileDoctor = doctorRes.data?.doctor || null;
      } catch (e) {
        // In "approve all", allow login approval even if profile is not created yet.
        if (!(applyLoginStep && e?.response?.status === 404)) {
          throw e;
        }
      }

      if (profileDoctor?.doctor_id) {
        await client.query(
          'INSERT INTO doctor_verification_reviews (doctor_id, reviewed_by_admin_id, review_status, reason) VALUES ($1, $2, $3, $4)',
          [profileDoctor.doctor_id, effectiveAdminUserId, status, reason || null]
        );
      }
    }

    let resolvedDoctorEmail = authUser?.email || profileDoctor?.email || null;
    if (!resolvedDoctorEmail) {
      const emailRes = await client.query(
        'SELECT email FROM users WHERE user_id = $1 LIMIT 1',
        [doctorId]
      );
      resolvedDoctorEmail = emailRes.rows?.[0]?.email || null;
    }

    const emailSuffix = resolvedDoctorEmail ? `: ${resolvedDoctorEmail}` : '';

    const actionType = applyLoginStep && applyProfileStep
      ? 'verify_doctor_all'
      : (applyLoginStep ? 'verify_doctor_login' : 'verify_doctor_profile');
    const actionNote = applyLoginStep && applyProfileStep
      ? (approved ? `Doctor login and profile approved${emailSuffix}` : `Doctor login and profile rejected${emailSuffix}`)
      : (applyLoginStep
        ? (approved ? `Doctor login approved${emailSuffix}` : `Doctor login rejected${emailSuffix}`)
        : (approved ? `Doctor profile approved${emailSuffix}` : `Doctor profile rejected${emailSuffix}`));

    await client.query(
      'INSERT INTO admin_actions (admin_user_id, action_type, target_entity, target_entity_id, action_note) VALUES ($1, $2, $3, $4, $5)',
      [effectiveAdminUserId, actionType, 'doctor', doctorId, actionNote]
    );

    await client.query('COMMIT');
    return { user: authUser, doctor: profileDoctor };
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
  const financialStatsRes = await db.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_amount,
       COUNT(*) AS total_records,
       COUNT(*) FILTER (WHERE flagged) AS flagged_records
     FROM financial_monitoring_records`
  );
  const financialStats = financialStatsRes.rows[0] || {};

  let approvedCount = 0;
  let rejectedCount = 0;
  try {
    const r = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE review_status = 'approved') AS approved,
         COUNT(*) FILTER (WHERE review_status = 'rejected') AS rejected
       FROM doctor_verification_reviews`,
    );
    approvedCount = Number(r.rows?.[0]?.approved || 0);
    rejectedCount = Number(r.rows?.[0]?.rejected || 0);
  } catch {
    // If the admin DB hasn't been initialized yet, keep counts at 0.
  }

  let pendingCount = 0;
  if (env.INTERNAL_API_KEY) {
    const doctors = await listPendingDoctors();
    pendingCount = doctors.filter((d) => {
      const login = String(d.login_verification_status || '').toLowerCase();
      const profile = String(d.profile_verification_status || '').toLowerCase();
      if (login === 'rejected' || profile === 'rejected') return false;
      return !(login === 'approved' && profile === 'approved');
    }).length;
  }

  return {
    doctorReviews: {
      doctors_approved: approvedCount,
      doctors_rejected: rejectedCount,
      doctors_pending: pendingCount
    },
    financials: financialStats
  };
};
