// Auth service: implements registration and login per schema
const db = require('../config/db');
const env = require('../config/environment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SALT_ROUNDS = Number(env.BCRYPT_SALT_ROUNDS) || 10;

exports.register = async (userData) => {
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

exports.login = async (credentials) => {
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
