import db from '../config/db.js';
import crypto from 'crypto';
import env from '../config/environment.js';
import * as notificationClient from './notificationClient.js';

const fetchAppointment = async ({ appointmentId, authorization }) => {
  const base = String(env.API_GATEWAY_URL || '').replace(/\/$/, '');
  if (!base) {
    const err = new Error('api_gateway_url_missing');
    err.status = 500;
    throw err;
  }

  const url = `${base}/api/v1/appointments/${encodeURIComponent(appointmentId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authorization || '',
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error((body && (body.error || body.message)) || 'appointment_lookup_failed');
    err.status = res.status;
    throw err;
  }

  const appointment = body && body.appointment;
  if (!appointment) {
    const err = new Error('appointment_not_found');
    err.status = 404;
    throw err;
  }

  return appointment;
};

const assertAppointmentConfirmed = async ({ appointmentId, authorization }) => {
  const appointment = await fetchAppointment({ appointmentId, authorization });
  const status = String(appointment.appointment_status || '').toLowerCase();
  if (status !== 'confirmed') {
    const err = new Error('appointment_not_confirmed');
    err.status = 422;
    err.details = { appointment_status: appointment.appointment_status };
    throw err;
  }
  return appointment;
};

const APPT_TIMEZONE = process.env.APP_TIMEZONE || process.env.TZ || 'UTC';

const parseTimeToHms = (time) => {
  if (!time) return null;
  const t = String(time).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] || 0);
  if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
  return { hh, mm, ss };
};

const normalizeTime = (time) => {
  const hms = parseTimeToHms(time);
  if (!hms) return null;
  const hh = String(hms.hh).padStart(2, '0');
  const mm = String(hms.mm).padStart(2, '0');
  const ss = String(hms.ss).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const nowKeyInTimezone = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APPT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return new Date().toISOString().slice(0, 19);
  }
};

const assertWithinAppointmentWindow = (appointment) => {
  const dateStr = String(appointment?.slot_date || '').slice(0, 10);
  const startTime = normalizeTime(appointment?.start_time);
  const endTime = normalizeTime(appointment?.end_time);

  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(dateStr) || !startTime || !endTime) {
    const err = new Error('appointment_slot_missing');
    err.status = 422;
    throw err;
  }

  const startKey = `${dateStr}T${startTime}`;
  const endKey = `${dateStr}T${endTime}`;
  const nowKey = nowKeyInTimezone();

  if (nowKey < startKey || nowKey > endKey) {
    const err = new Error('outside_appointment_window');
    err.status = 423;
    err.details = {
      slot_date: appointment?.slot_date,
      start_time: appointment?.start_time,
      end_time: appointment?.end_time,
      timezone: APPT_TIMEZONE,
    };
    throw err;
  }
};

export const createSession = async (payload, user, { authorization } = {}) => {
  const { appointment_id, provider = 'jitsi', external_room_id = null } = payload || {};
  if (!appointment_id) {
    const err = new Error('missing_appointment_id');
    err.status = 400;
    throw err;
  }

  const normalizedUserRole = String(user?.role || '').toLowerCase();
  const canCreate = normalizedUserRole === 'doctor' || normalizedUserRole === 'admin';

  if ((provider || '').toLowerCase() !== 'jitsi') {
    const err = new Error('unsupported_provider');
    err.status = 400;
    throw err;
  }

  // Part A — backend guard: ensure appointment is confirmed.
  const appointment = await assertAppointmentConfirmed({ appointmentId: appointment_id, authorization });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Part B — duplicate session guard: lock by appointment_id so only one session is created.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [String(appointment_id)]);

    const existing = await client.query(
      `SELECT session_id, appointment_id, provider, external_room_id, session_status, started_at, ended_at, created_at
       FROM telemedicine_sessions
       WHERE appointment_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [appointment_id],
    );

    if (existing.rows && existing.rows[0]) {
      await client.query('COMMIT');
      return { session: existing.rows[0], existing: true };
    }

    // Patients can only join existing sessions; they cannot create new ones.
    if (!canCreate) {
      const err = new Error('session_not_available');
      err.status = 409;
      throw err;
    }

    const insertText = `
      INSERT INTO telemedicine_sessions (session_id, appointment_id, provider, external_room_id, session_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING session_id, appointment_id, provider, external_room_id, session_status, started_at, ended_at, created_at
    `;
    const sessionId = crypto.randomUUID();
    const roomName = external_room_id || `docapp-${sessionId}`;
    const values = [sessionId, appointment_id, 'jitsi', roomName, 'created'];
    const result = await client.query(insertText, values);
    await client.query('COMMIT');

    // Notify patient that a telemedicine session has been configured (best-effort)
    try {
      const dateStr = String(appointment?.slot_date || '').slice(0, 10) || null;
      const timeStr = appointment?.start_time ? String(appointment.start_time).slice(0, 5) : null;

      await notificationClient.sendEmail({
        callerId: user?.user_id,
        callerRole: user?.role,
        recipient_user_id: appointment?.patient_id,
        recipient_email: appointment?.patient_email,
        template_code: 'TELEMEDICINE_SESSION_CONFIGURED',
        message: 'Your telemedicine session has been scheduled.',
        payload_json: {
          patientName:
            appointment?.patient_name ||
            (appointment?.patient_email
              ? String(appointment.patient_email).split('@')[0]
              : 'Patient'),
          doctorName: appointment?.doctor_name || 'Doctor',
          date: dateStr,
          time: timeStr,
        },
      });
    } catch {
      // Best-effort
    }

    return { session: result.rows[0], existing: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getSession = async (sessionId) => {
  if (!sessionId) return null;
  const q = `SELECT session_id, appointment_id, provider, external_room_id, session_status, started_at, ended_at, created_at FROM telemedicine_sessions WHERE session_id = $1`;
  const res = await db.query(q, [sessionId]);
  const session = res.rows && res.rows[0];
  if (!session) return null;
  const participantsRes = await db.query('SELECT participant_id, user_id, participant_role, join_time, leave_time FROM session_participants WHERE session_id = $1', [sessionId]);
  session.participants = participantsRes.rows || [];
  return session;
};

export const listSessions = async ({ status } = {}) => {
  const normalized = String(status || '').toLowerCase().trim();

  let where = '';
  const params = [];
  if (normalized === 'ended') {
    where = 'WHERE session_status = $1';
    params.push('ended');
  } else if (normalized === 'pending') {
    // Treat anything not ended as pending (created/active)
    where = 'WHERE session_status <> $1';
    params.push('ended');
  }

  const { rows } = await db.query(
    `SELECT session_id, appointment_id, provider, external_room_id, session_status, started_at, ended_at, created_at
     FROM telemedicine_sessions
     ${where}
     ORDER BY created_at DESC`,
    params,
  );

  return { sessions: rows || [] };
};

export const createJoinToken = async (sessionId, user, role = 'patient', { authorization } = {}) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }
  // verify session exists
  const s = await db.query(
    'SELECT session_id, appointment_id, session_status, provider, external_room_id FROM telemedicine_sessions WHERE session_id = $1',
    [sessionId]
  );
  if (!s.rows || !s.rows[0]) {
    const e = new Error('session_not_found');
    e.status = 404;
    throw e;
  }
  const session = s.rows[0];

  // Guard: only allow joining if appointment is confirmed and within the appointment's time window.
  if (session.appointment_id) {
    const appointment = await assertAppointmentConfirmed({ appointmentId: session.appointment_id, authorization });
    assertWithinAppointmentWindow(appointment);
  }

  const roomName = session.external_room_id || `docapp-${sessionId}`;
  const joinUrl = `${(env.JITSI_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '')}/${roomName}`;

  // Enforce role from authenticated user (client-provided role is advisory only).
  const normalizedUserRole = String(user?.role || '').toLowerCase();
  const effectiveRole = normalizedUserRole === 'doctor' || normalizedUserRole === 'admin' ? 'doctor' : 'patient';

  // record participant (best-effort, non-unique)
  const participantId = crypto.randomUUID();
  await db.query(
    'INSERT INTO session_participants (participant_id, session_id, user_id, participant_role, join_time) VALUES ($1, $2, $3, $4, now())',
    [participantId, sessionId, user ? user.user_id : null, effectiveRole]
  );

  return {
    provider: 'jitsi',
    roomName,
    joinUrl,
    role: effectiveRole
  };
};

export const startSession = async (sessionId, user, { authorization } = {}) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }

  const normalizedUserRole = String(user?.role || '').toLowerCase();
  if (!(normalizedUserRole === 'doctor' || normalizedUserRole === 'admin')) {
    const err = new Error('forbidden');
    err.status = 403;
    throw err;
  }

  const s = await db.query(
    'SELECT session_id, appointment_id, session_status FROM telemedicine_sessions WHERE session_id = $1',
    [sessionId],
  );
  if (!s.rows || !s.rows[0]) {
    const e = new Error('session_not_found');
    e.status = 404;
    throw e;
  }

  const session = s.rows[0];
  let appointment = null;
  if (session.appointment_id) {
    appointment = await assertAppointmentConfirmed({ appointmentId: session.appointment_id, authorization });
    assertWithinAppointmentWindow(appointment);
  }

  const updateRes = await db.query(
    "UPDATE telemedicine_sessions SET session_status = $1, started_at = now() WHERE session_id = $2 AND session_status <> $1 AND session_status <> 'ended'",
    ['active', sessionId],
  );

  // Only notify if this call actually transitioned state to active
  if (updateRes && updateRes.rowCount > 0 && appointment) {
    try {
      await notificationClient.sendEmail({
        callerId: user?.user_id,
        callerRole: user?.role,
        recipient_user_id: appointment?.patient_id,
        recipient_email: appointment?.patient_email,
        template_code: 'TELEMEDICINE_SESSION_STARTED',
        message: 'Your telemedicine session has started.',
        payload_json: {
          patientName:
            appointment?.patient_name ||
            (appointment?.patient_email
              ? String(appointment.patient_email).split('@')[0]
              : 'Patient'),
          doctorName: appointment?.doctor_name || 'Doctor',
        },
      });
    } catch {
      // Best-effort
    }
  }
};

export const endSession = async (sessionId, user, { authorization } = {}) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }

  const normalizedUserRole = String(user?.role || '').toLowerCase();
  if (!(normalizedUserRole === 'doctor' || normalizedUserRole === 'admin')) {
    const err = new Error('forbidden');
    err.status = 403;
    throw err;
  }

  const updateRes = await db.query(
    "UPDATE telemedicine_sessions SET session_status = $1, ended_at = now() WHERE session_id = $2 AND session_status <> $1 RETURNING appointment_id",
    ['ended', sessionId],
  );

  // Only notify if this call actually transitioned state to ended
  if (updateRes && updateRes.rows && updateRes.rows[0] && updateRes.rowCount > 0) {
    const appointmentId = updateRes.rows[0].appointment_id;
    if (appointmentId) {
      try {
        const appointment = await fetchAppointment({ appointmentId, authorization });
        await notificationClient.sendEmail({
          callerId: user?.user_id,
          callerRole: user?.role,
          recipient_user_id: appointment?.patient_id,
          recipient_email: appointment?.patient_email,
          template_code: 'TELEMEDICINE_SESSION_ENDED',
          message: 'Your telemedicine session has ended.',
          payload_json: {
            patientName:
              appointment?.patient_name ||
              (appointment?.patient_email
                ? String(appointment.patient_email).split('@')[0]
                : 'Patient'),
            doctorName: appointment?.doctor_name || 'Doctor',
          },
        });
      } catch {
        // Best-effort
      }
    }
  }
};

export const deleteSession = async (sessionId, user) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }

  const normalizedUserRole = String(user?.role || '').toLowerCase();
  if (!(normalizedUserRole === 'doctor' || normalizedUserRole === 'admin')) {
    const err = new Error('forbidden');
    err.status = 403;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM session_participants WHERE session_id = $1', [sessionId]);
    const res = await client.query('DELETE FROM telemedicine_sessions WHERE session_id = $1', [sessionId]);
    await client.query('COMMIT');
    if (!res || res.rowCount === 0) {
      const e = new Error('session_not_found');
      e.status = 404;
      throw e;
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
