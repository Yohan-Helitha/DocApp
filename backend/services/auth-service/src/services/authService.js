// Auth service: implements registration and login per schema
import db from '../config/db.js';
import env from '../config/environment.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SALT_ROUNDS = Number(env.BCRYPT_SALT_ROUNDS) || 10;

export const register = async (userData) => {
  const { email, password, role } = userData || {};
  if (!email || !password || !role) {
    const err = new Error('invalid_input');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = `
      INSERT INTO users (email, password_hash, role, account_status)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, email, role, account_status, created_at, updated_at
    `;
    const values = [email.toLowerCase(), passwordHash, role, 'active'];
    const result = await client.query(insertText, values);
    await client.query('COMMIT');
    const user = result.rows[0];
    return { user };
  } catch (err) {
    await client.query('ROLLBACK');
    // handle unique violation (email exists)
    if (err && err.code === '23505') {
      const e = new Error('email_exists');
      e.status = 409;
      throw e;
    }
    throw err;
  } finally {
    client.release();
  }
};

export const login = async (credentials) => {
  const { email, password } = credentials || {};
  if (!email || !password) {
    const err = new Error('invalid_input');
    err.status = 400;
    throw err;
  }

  const text = `SELECT user_id, email, password_hash, role, account_status FROM users WHERE email = $1`;
  const res = await db.query(text, [email.toLowerCase()]);
  const user = res.rows && res.rows[0];
  if (!user) {
    const e = new Error('invalid_credentials');
    e.status = 401;
    throw e;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const e = new Error('invalid_credentials');
    e.status = 401;
    throw e;
  }

  const payload = { sub: user.user_id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET || 'change-me', { expiresIn: '15m' });

  // create refresh token (raw returned to client) and store hashed form
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.user_id, refreshHash, expiresAt]
  );

  return { accessToken, refreshToken, expiresAt };
};

export const refreshToken = async (rawToken) => {
  // find non-expired tokens
  const res = await db.query('SELECT token_id, user_id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE expires_at > now()');
  const rows = res.rows || [];
  let found = null;
  for (const row of rows) {
    if (row.revoked_at) continue;
    const match = await bcrypt.compare(rawToken, row.token_hash);
    if (match) {
      found = row;
      break;
    }
  }
  if (!found) {
    const e = new Error('invalid_refresh_token');
    e.status = 401;
    throw e;
  }

  // issue new access token
  const payload = { sub: found.user_id };
  const accessToken = jwt.sign(payload, env.JWT_SECRET || 'change-me', { expiresIn: '15m' });

  // rotate: revoke old token and insert a new one
  await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_id = $1', [found.token_id]);
  const newRaw = crypto.randomBytes(64).toString('hex');
  const newHash = await bcrypt.hash(newRaw, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [found.user_id, newHash, expiresAt]);

  return { accessToken, refreshToken: newRaw, expiresAt };
};

export const logout = async (rawToken) => {
  // mark matching refresh token as revoked
  const res = await db.query('SELECT token_id, token_hash FROM refresh_tokens WHERE revoked_at IS NULL');
  const rows = res.rows || [];
  for (const row of rows) {
    const match = await bcrypt.compare(rawToken, row.token_hash);
    if (match) {
      await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_id = $1', [row.token_id]);
      return;
    }
  }
  const e = new Error('invalid_refresh_token');
  e.status = 401;
  throw e;
};

export const verifyToken = async (token) => {
  return jwt.verify(token, env.JWT_SECRET || '');
};
