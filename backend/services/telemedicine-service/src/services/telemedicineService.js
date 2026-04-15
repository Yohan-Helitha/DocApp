import db from '../config/db.js';
import crypto from 'crypto';
import env from '../config/environment.js';

export const createSession = async (payload, user) => {
  const { appointment_id, provider = 'jitsi', external_room_id = null } = payload || {};
  if (!appointment_id) {
    const err = new Error('missing_appointment_id');
    err.status = 400;
    throw err;
  }

  if ((provider || '').toLowerCase() !== 'jitsi') {
    const err = new Error('unsupported_provider');
    err.status = 400;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
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
    return { session: result.rows[0] };
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

export const createJoinToken = async (sessionId, user, role = 'patient') => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }
  // verify session exists
  const s = await db.query('SELECT session_id, session_status, provider, external_room_id FROM telemedicine_sessions WHERE session_id = $1', [sessionId]);
  if (!s.rows || !s.rows[0]) {
    const e = new Error('session_not_found');
    e.status = 404;
    throw e;
  }
  const session = s.rows[0];
  const roomName = session.external_room_id || `docapp-${sessionId}`;
  const joinUrl = `${(env.JITSI_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '')}/${roomName}`;

  // record participant (best-effort, non-unique)
  const participantId = crypto.randomUUID();
  await db.query(
    'INSERT INTO session_participants (participant_id, session_id, user_id, participant_role, join_time) VALUES ($1, $2, $3, $4, now())',
    [participantId, sessionId, user ? user.user_id : null, role]
  );

  return {
    provider: 'jitsi',
    roomName,
    joinUrl,
    role
  };
};

export const startSession = async (sessionId, user) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }
  // mark started
  await db.query('UPDATE telemedicine_sessions SET session_status = $1, started_at = now() WHERE session_id = $2', ['active', sessionId]);
};

export const endSession = async (sessionId, user) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
    throw err;
  }
  await db.query('UPDATE telemedicine_sessions SET session_status = $1, ended_at = now() WHERE session_id = $2', ['ended', sessionId]);
};

export const deleteSession = async (sessionId, user) => {
  if (!sessionId) {
    const err = new Error('missing_session_id');
    err.status = 400;
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
