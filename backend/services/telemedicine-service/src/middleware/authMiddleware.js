// Lightweight auth middleware mirroring auth-service behavior
import jwt from 'jsonwebtoken';
import axios from 'axios';
import jwkToPem from 'jwk-to-pem';
import env from '../config/environment.js';
import db from '../config/db.js';
import fs from 'fs';
import path from 'path';

const jwksCache = { keys: {}, fetchedAt: 0 };
const JWKS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchJwks() {
  const now = Date.now();
  if (jwksCache.fetchedAt && now - jwksCache.fetchedAt < JWKS_CACHE_TTL) return jwksCache.keys;
  try {
    const res = await axios.get(env.AUTH_JWKS_URL);
    const jwks = res.data && res.data.keys ? res.data.keys : [];
    const map = {};
    for (const jwk of jwks) {
      if (jwk.kid) map[jwk.kid] = jwk;
    }
    jwksCache.keys = map;
    jwksCache.fetchedAt = Date.now();
    return map;
  } catch (e) {
    return jwksCache.keys || {};
  }
}

export default async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const token = auth.split(' ')[1];
  try {
    // Prefer RS256 via JWKS
    let payload = null;
    try {
      const decoded = jwt.decode(token, { complete: true });
      const kid = decoded && decoded.header && decoded.header.kid;
      const keys = await fetchJwks();
      let jwk = null;
      if (kid && keys[kid]) jwk = keys[kid];
      else if (!kid) {
        // if no kid, try single key
        const ids = Object.keys(keys);
        if (ids.length === 1) jwk = keys[ids[0]];
      }
      if (jwk) {
        const pem = jwkToPem(jwk);
        payload = jwt.verify(token, pem, { algorithms: ['RS256'] });
      }
    } catch (e) {
      // fallthrough to HS256
    }

    if (!payload) {
      // try to read public PEM directly from auth-service keys as a local fallback (dev/test)
      try {
        const pubPath = path.resolve(process.cwd(), '../auth-service/keys/public.pem');
        if (fs.existsSync(pubPath)) {
          const pem = fs.readFileSync(pubPath, 'utf8');
          payload = jwt.verify(token, pem, { algorithms: ['RS256'] });
        }
      } catch (e) {
        // ignore
      }
    }

    if (!payload) {
      payload = jwt.verify(token, env.JWT_SECRET || '');
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
