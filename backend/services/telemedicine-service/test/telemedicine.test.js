import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../src/config/db.js';
import jwt from 'jsonwebtoken';
import env from '../src/config/environment.js';
import fs from 'fs';
import path from 'path';
import { randomUUID, generateKeyPairSync } from 'crypto';

let app; // will import after keys are generated

describe('Telemedicine API', function () {
  this.timeout(5000);

  before(async function () {
    // Ensure RSA test keys exist so middleware can verify RS256 tokens.
    const keysDir = path.resolve(process.cwd(), '../auth-service/keys');
    try {
      fs.mkdirSync(keysDir, { recursive: true });
    } catch (e) {}
    const pubPath = path.join(keysDir, 'public.pem');
    const pkPath = path.join(keysDir, 'private.pem');
    // Always (re)generate dev RSA keys to ensure valid matching pair for tests.
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });
    fs.writeFileSync(pubPath, publicKey, 'utf8');
    fs.writeFileSync(pkPath, privateKey, 'utf8');

    // import app after keys are present so auth middleware can read public.pem
    app = (await import('../src/app.js')).default;

    // create tables if missing
    await db.query(`CREATE TABLE IF NOT EXISTS telemedicine_sessions (
      session_id uuid PRIMARY KEY,
      appointment_id uuid,
      provider text,
      external_room_id text,
      session_status text,
      started_at timestamptz,
      ended_at timestamptz,
      created_at timestamptz DEFAULT now()
    );`);

    await db.query(`CREATE TABLE IF NOT EXISTS session_participants (
      participant_id uuid PRIMARY KEY,
      session_id uuid REFERENCES telemedicine_sessions(session_id),
      user_id uuid,
      participant_role text,
      join_time timestamptz,
      leave_time timestamptz
    );`);
  });

  after(async function () {
    // cleanup data
    try {
      await db.query('DELETE FROM session_participants');
      await db.query('DELETE FROM telemedicine_sessions');
    } catch (e) {
      // ignore
    }
  });

  it('creates a session', async function () {
    // sign with auth-service private key (RS256) for realistic verification
    const pkPath = path.resolve(process.cwd(), '../auth-service/keys/private.pem');
    let token;
    if (fs.existsSync(pkPath)) {
      const privateKey = fs.readFileSync(pkPath, 'utf8');
      token = jwt.sign({ sub: randomUUID(), email: 'test@example.com', role: 'doctor' }, privateKey, { algorithm: 'RS256', expiresIn: '1h', keyid: 'auth-key-1' });
    } else {
      token = jwt.sign({ sub: randomUUID(), email: 'test@example.com', role: 'doctor' }, env.JWT_SECRET || 'change-me', { expiresIn: '1h' });
    }
    const appointmentId = randomUUID();
    const res = await request(app)
      .post('/api/v1/telemedicine/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: appointmentId, provider: 'agora' })
      .expect(201);
    assert(res.body.session && res.body.session.session_id, 'session_id returned');
  });

  it('retrieves a session', async function () {
    const sessionId = randomUUID();
    await db.query('INSERT INTO telemedicine_sessions (session_id, appointment_id, provider, session_status) VALUES ($1,$2,$3,$4)', [sessionId, randomUUID(), 'agora', 'created']);
    const pkPath = path.resolve(process.cwd(), '../auth-service/keys/private.pem');
    let token;
    if (fs.existsSync(pkPath)) {
      const privateKey = fs.readFileSync(pkPath, 'utf8');
      token = jwt.sign({ sub: randomUUID(), email: 'tester@example.com', role: 'patient' }, privateKey, { algorithm: 'RS256', expiresIn: '1h', keyid: 'auth-key-1' });
    } else {
      token = jwt.sign({ sub: randomUUID(), email: 'tester@example.com', role: 'patient' }, env.JWT_SECRET || 'change-me', { expiresIn: '1h' });
    }
    const res = await request(app)
      .get(`/api/v1/telemedicine/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert(res.body.session_id === sessionId || res.body.session, 'session returned');
  });

  it('creates a join token', async function () {
    const sessionId = randomUUID();
    await db.query('INSERT INTO telemedicine_sessions (session_id, appointment_id, provider, session_status) VALUES ($1,$2,$3,$4)', [sessionId, randomUUID(), 'agora', 'created']);
    const userId = randomUUID();
    const pkPath = path.resolve(process.cwd(), '../auth-service/keys/private.pem');
    let token;
    if (fs.existsSync(pkPath)) {
      const privateKey = fs.readFileSync(pkPath, 'utf8');
      token = jwt.sign({ sub: userId, email: 'u@example.com', role: 'patient' }, privateKey, { algorithm: 'RS256', expiresIn: '1h', keyid: 'auth-key-1' });
    } else {
      token = jwt.sign({ sub: userId, email: 'u@example.com', role: 'patient' }, env.JWT_SECRET || 'change-me', { expiresIn: '1h' });
    }
    const res = await request(app)
      .post(`/api/v1/telemedicine/sessions/${sessionId}/join-token`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'patient' })
      .expect(200);
    assert(res.body.joinToken, 'joinToken returned');
  });
});
