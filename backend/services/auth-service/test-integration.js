// Integration test script for auth-service: tests all routes defined in authRoutes.js
(async()=>{
  const base = 'http://localhost:4000';
  const headers = { 'content-type': 'application/json' };
  const results = {};
  try {
    // 1) Generic register with explicit role
    const r1 = await fetch(base + '/api/v1/auth/register', { method: 'POST', headers, body: JSON.stringify({ email: 'general1@example.com', password: 'Password123', role: 'patient' }) });
    results.register = { status: r1.status, body: await r1.json().catch(()=>null) };

    // 2) Role-specific registers
    const r2 = await fetch(base + '/api/v1/auth/register/patient', { method: 'POST', headers, body: JSON.stringify({ email: 'patient2@example.com', password: 'Password123' }) });
    results.register_patient = { status: r2.status, body: await r2.json().catch(()=>null) };

    const r3 = await fetch(base + '/api/v1/auth/register/doctor', { method: 'POST', headers, body: JSON.stringify({ email: 'doctor1@example.com', password: 'Password123' }) });
    results.register_doctor = { status: r3.status, body: await r3.json().catch(()=>null) };

    const r4 = await fetch(base + '/api/v1/auth/register/admin', { method: 'POST', headers, body: JSON.stringify({ email: 'admin1@example.com', password: 'Password123' }) });
    results.register_admin = { status: r4.status, body: await r4.json().catch(()=>null) };

    // 3) Login with one of the created users
    const loginRes = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers, body: JSON.stringify({ email: 'patient2@example.com', password: 'Password123' }) });
    const loginBody = await loginRes.json().catch(()=>null);
    results.login = { status: loginRes.status, body: loginBody };

    const access = loginBody && loginBody.accessToken;
    const refresh = loginBody && loginBody.refreshToken;check

    // 4) Refresh token
    const refreshRes = await fetch(base + '/api/v1/auth/refresh-token', { method: 'POST', headers, body: JSON.stringify({ refreshToken: refresh }) });
    const refreshBody = await refreshRes.json().catch(()=>null);
    results.refresh = { status: refreshRes.status, body: refreshBody };

    // 5) Logout (revoke the most recent refresh token returned by login or refresh)
    const logoutToken = (refreshBody && refreshBody.refreshToken) || refresh;
    const logoutRes = await fetch(base + '/api/v1/auth/logout', { method: 'POST', headers, body: JSON.stringify({ refreshToken: logoutToken }) });
    results.logout = { status: logoutRes.status, body: await logoutRes.json().catch(()=>null) };

    // 6) Verify token
    const verifyRes = await fetch(base + '/api/v1/auth/verify-token', { method: 'GET', headers: { Authorization: 'Bearer ' + access } });
    results.verify = { status: verifyRes.status, body: await verifyRes.json().catch(()=>null) };

    // 7) Protected /me
    const meRes = await fetch(base + '/api/v1/auth/me', { method: 'GET', headers: { Authorization: 'Bearer ' + access } });
    results.me = { status: meRes.status, body: await meRes.json().catch(()=>null) };

    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error('integration-test-error', e);
    process.exit(1);
  }
})();
