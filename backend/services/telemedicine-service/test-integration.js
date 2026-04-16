// Integration test script for telemedicine-service: tests all protected telemedicine routes
import crypto from 'crypto';

(async () => {
  const authBase = process.env.AUTH_BASE_URL || 'http://localhost:4001';
  const teleBase = process.env.TELEMED_BASE_URL || 'http://localhost:4010';
  const jsonHeaders = { 'content-type': 'application/json' };
  const results = {};

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  try {
    // 1) Ensure doctor exists (ignore already-exists conflicts)
    const registerRes = await fetch(authBase + '/api/v1/auth/register/doctor', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        email: 'doc1@example.com',
        password: 'Passw0rd!',
        name: 'Dr Test'
      })
    });
    results.register_doctor = { status: registerRes.status, body: await safeJson(registerRes) };

    // 2) Login and get access token
    const loginRes = await fetch(authBase + '/api/v1/auth/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        email: 'doc1@example.com',
        password: 'Passw0rd!'
      })
    });
    const loginBody = await safeJson(loginRes);
    results.login = { status: loginRes.status, body: loginBody };

    const accessToken = loginBody && loginBody.accessToken;
    if (!accessToken) {
      results.error = 'missing_access_token';
      console.log(JSON.stringify(results, null, 2));
      process.exit(1);
    }

    const authHeaders = {
      Authorization: 'Bearer ' + accessToken,
      'content-type': 'application/json'
    };

    // 3) Create telemedicine session
    const appointmentId = crypto.randomUUID();
    const createRes = await fetch(teleBase + '/api/v1/telemedicine/sessions', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        appointment_id: appointmentId,
        provider: 'jitsi'
      })
    });
    const createBody = await safeJson(createRes);
    results.create_session = { status: createRes.status, body: createBody };

    const sessionId = createBody && createBody.session && createBody.session.session_id;
    if (!sessionId) {
      results.error = 'missing_session_id';
      console.log(JSON.stringify(results, null, 2));
      process.exit(1);
    }

    // 4) Get session
    const getRes = await fetch(teleBase + '/api/v1/telemedicine/sessions/' + sessionId, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    results.get_session = { status: getRes.status, body: await safeJson(getRes) };

    // 5) Create Jitsi join details
    const joinRes = await fetch(teleBase + '/api/v1/telemedicine/sessions/' + sessionId + '/join-token', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ role: 'patient' })
    });
    results.join_details = { status: joinRes.status, body: await safeJson(joinRes) };

    // 6) Start session
    const startRes = await fetch(teleBase + '/api/v1/telemedicine/sessions/' + sessionId + '/start', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    results.start_session = { status: startRes.status, body: await safeJson(startRes) };

    // 7) End session
    const endRes = await fetch(teleBase + '/api/v1/telemedicine/sessions/' + sessionId + '/end', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    results.end_session = { status: endRes.status, body: await safeJson(endRes) };

    // 8) Negative check (missing auth header should be rejected)
    const unauthorizedRes = await fetch(teleBase + '/api/v1/telemedicine/sessions/' + sessionId, {
      method: 'GET'
    });
    results.unauthorized_get = { status: unauthorizedRes.status, body: await safeJson(unauthorizedRes) };

    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('integration-test-error', e);
    process.exit(1);
  }
})();
