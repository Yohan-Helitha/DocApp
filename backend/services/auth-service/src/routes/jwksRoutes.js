import express from 'express';
import fs from 'fs';
import path from 'path';
import rsaPemToJwk from 'rsa-pem-to-jwk';
import env from '../config/environment.js';

const router = express.Router();

router.get(env.JWKS_PATH || '/.well-known/jwks.json', (req, res) => {
  try {
    const pubPath = path.resolve(process.cwd(), env.AUTH_PUBLIC_KEY_PATH || './keys/public.pem');
    if (!fs.existsSync(pubPath)) return res.status(404).json({ keys: [] });
    const pub = fs.readFileSync(pubPath, 'utf8');
    const jwk = rsaPemToJwk(pub, { use: 'sig', kid: 'auth-key-1', alg: 'RS256' }, 'public');
    return res.json({ keys: [jwk] });
  } catch (err) {
    return res.status(500).json({ error: 'jwks_error' });
  }
});

export default router;
