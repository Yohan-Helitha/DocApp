// RS256-only auth middleware for admin actions.
// Validates admin JWTs issued by auth-service (RS256).

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import env from '../config/environment.js';

let cachedPublicKey = null;

const loadPublicKey = () => {
  if (cachedPublicKey) return cachedPublicKey;

  const configuredPath = env.AUTH_PUBLIC_KEY_PATH;
  if (!configuredPath) {
    const e = new Error('auth_public_key_path_not_configured');
    e.status = 503;
    throw e;
  }

  const absPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  cachedPublicKey = fs.readFileSync(absPath, 'utf8');
  return cachedPublicKey;
};

export default function authAdminRs256(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const token = auth.split(' ')[1];
  try {
    const publicKey = loadPublicKey();
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role };

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }

    return next();
  } catch (err) {
    if (err && (err.status === 503 || err.message === 'auth_public_key_path_not_configured')) {
      return res.status(503).json({ error: 'auth_public_key_not_configured' });
    }
    return res.status(401).json({ error: 'invalid_token' });
  }
}
