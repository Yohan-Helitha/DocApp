// Lightweight auth middleware using RS256 public key verification
import jwt from 'jsonwebtoken';
import env from '../config/environment.js';
import db from '../config/db.js';
import fs from 'fs';
import path from 'path';

// Decode JWT header without verifying to inspect the algorithm
const getTokenHeader = (token) => {
  try {
    const [rawHeader] = token.split('.');
    if (!rawHeader) return null;
    const json = Buffer.from(rawHeader, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export default async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const token = auth.split(' ')[1];
  try {
    const header = getTokenHeader(token) || {};
    let payload;

    if (header.alg === 'HS256') {
      // Verify using shared secret; must match auth-service JWT_SECRET
      if (!env.JWT_SECRET) {
        return res.status(500).json({ error: 'auth_secret_missing' });
      }
      payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    } else {
      // Default path: verify using the shared RSA public key.
      const pubPath = path.resolve(process.cwd(), env.AUTH_PUBLIC_KEY_PATH || './keys/public.pem');
      if (!fs.existsSync(pubPath)) {
        return res.status(500).json({ error: 'auth_public_key_missing' });
      }
      const pem = fs.readFileSync(pubPath, 'utf8');
      payload = jwt.verify(token, pem, { algorithms: ['RS256'] });
    }

    if (!payload || !payload.sub) return res.status(401).json({ error: 'invalid_token' });

    // attempt to load user record if users table exists in this DB
    try {
      const r = await db.query('SELECT user_id, email, role, account_status FROM users WHERE user_id = $1', [payload.sub]);
      const user = r.rows && r.rows[0];
      if (!user) return res.status(401).json({ error: 'invalid_token' });
      req.user = user;
    } catch (e) {
      // if users table not present, still attach minimal payload
      req.user = { user_id: payload.sub, email: payload.email, role: payload.role };
    }

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};
