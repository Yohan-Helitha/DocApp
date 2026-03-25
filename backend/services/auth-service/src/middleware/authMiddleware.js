// Authentication middleware
// - Verifies Bearer JWT from Authorization header
// - Attaches user record to `req.user` when valid
// - Returns 401 on missing/invalid token

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import env from '../config/environment.js';
import db from '../config/db.js';

export default async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const token = auth.split(' ')[1];
  try {
    // Prefer RS256 public key verification if available
    try {
      const pubPath = path.resolve(process.cwd(), env.AUTH_PUBLIC_KEY_PATH || './keys/public.pem');
      if (fs.existsSync(pubPath)) {
        const publicKey = fs.readFileSync(pubPath, 'utf8');
        const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        if (!payload || !payload.sub) return res.status(401).json({ error: 'invalid_token' });

        const q = 'SELECT user_id, email, role, account_status FROM users WHERE user_id = $1';
        const r = await db.query(q, [payload.sub]);
        const user = r.rows && r.rows[0];
        if (!user) return res.status(401).json({ error: 'invalid_token' });
        if (user.account_status !== 'active') return res.status(403).json({ error: 'account_inactive' });

        req.user = { id: user.user_id, email: user.email, role: user.role };
        return next();
      }
    } catch (e) {
      // fall back to HS256
    }

    const payload = jwt.verify(token, env.JWT_SECRET || '');
    // payload.sub should be user_id
    if (!payload || !payload.sub) return res.status(401).json({ error: 'invalid_token' });

    // load user from DB to ensure still exists and not disabled
    const q = 'SELECT user_id, email, role, account_status FROM users WHERE user_id = $1';
    const r = await db.query(q, [payload.sub]);
    const user = r.rows && r.rows[0];
    if (!user) return res.status(401).json({ error: 'invalid_token' });
    if (user.account_status !== 'active') return res.status(403).json({ error: 'account_inactive' });

    req.user = { id: user.user_id, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
};
