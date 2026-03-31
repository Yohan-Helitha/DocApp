import React, { useMemo, useState } from 'react';
import Api from '../../core/api';

export default function Telemedicine({ navigate }) {
  const [appointmentId, setAppointmentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [role, setRole] = useState('patient');
  const [joinUrl, setJoinUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const accessToken = useMemo(() => sessionStorage.getItem('accessToken') || '', []);

  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await Api.post('/api/v1/auth/logout', { refreshToken });
      } catch {}
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    if (navigate) navigate('/login');
    else window.location.hash = '/login';
  };

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  const authedFetch = async (path, method, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = 'Bearer ' + accessToken;

    const res = await fetch(Api.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  };

  const run = async (fn) => {
    setLoading(true);
    try {
      const output = await fn();
      setResult(output);
      return output;
    } catch (err) {
      setResult({ status: 0, body: { error: err?.message || 'unexpected_error' } });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    const appt = appointmentId.trim() || crypto.randomUUID();
    setAppointmentId(appt);

    const output = await run(() =>
      authedFetch('/api/v1/telemedicine/sessions', 'POST', {
        appointment_id: appt,
        provider: 'jitsi'
      })
    );

    const id = output && output.body && output.body.session && output.body.session.session_id;
    if (id) setSessionId(id);
  };

  const getSession = async () => {
    if (!sessionId.trim()) return;
    await run(() => authedFetch('/api/v1/telemedicine/sessions/' + sessionId.trim(), 'GET'));
  };

  const createJoinToken = async () => {
    if (!sessionId.trim()) return;
    const output = await run(() =>
      authedFetch('/api/v1/telemedicine/sessions/' + sessionId.trim() + '/join-token', 'POST', {
        role
      })
    );

    const url = output && output.body && output.body.joinUrl;
    if (url) setJoinUrl(url);
  };

  const openMeeting = () => {
    if (!joinUrl) return;
    window.open(joinUrl, '_blank', 'noopener,noreferrer');
  };

  const startSession = async () => {
    if (!sessionId.trim()) return;
    await run(() => authedFetch('/api/v1/telemedicine/sessions/' + sessionId.trim() + '/start', 'PUT'));
  };

  const endSession = async () => {
    if (!sessionId.trim()) return;
    await run(() => authedFetch('/api/v1/telemedicine/sessions/' + sessionId.trim() + '/end', 'PUT'));
  };

  return (
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 p-4 z-40">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">clinical_notes</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0b9385]">SmartHealth AI</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctor Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo('/success/doctor')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo('/doctor/appointments')}
          >
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo('/doctor/availability')}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-semibold text-sm">Availability</span>
          </a>
          <button
            type="button"
            onClick={() => goTo('/telemedicine')}
            className="w-full text-left bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer"
          >
            <span className="material-symbols-outlined" data-icon="video_chat">video_chat</span>
            <span className="font-semibold text-sm">Telemedicine</span>
          </button>
        </nav>

        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button onClick={logout} className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      <main className="md:ml-64 p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b9385]">Doctor Workspace</p>
            <h1 className="text-3xl font-extrabold mt-2">Telemedicine Console</h1>
            <p className="text-sm text-slate-500 mt-1">Create Jitsi sessions, generate meeting links, and control consultation status.</p>
          </div>
          <button
            type="button"
            onClick={() => (navigate ? navigate('/success/doctor') : (window.location.hash = '/success/doctor'))}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-sm hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
        </div>

        {!accessToken && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm font-medium">
            No access token in session. Please login first.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0b9385]">video_chat</span>
              Session Setup
            </h2>

            <label className="block text-sm font-semibold mb-1">Appointment ID</label>
            <input
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4 text-sm"
            />

            <label className="block text-sm font-semibold mb-1">Provider</label>
            <div className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4 text-sm bg-slate-100 text-slate-700 font-semibold">
              Jitsi Meet (configured)
            </div>

            <button
              type="button"
              onClick={createSession}
              disabled={loading || !accessToken}
              className="w-full bg-[#0b9385] text-white rounded-lg py-2.5 font-bold disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create Session'}
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Session Actions</h2>

            <label className="block text-sm font-semibold mb-1">Session ID</label>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Paste or create a session first"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4 text-sm"
            />

            <label className="block text-sm font-semibold mb-1">Join Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-4 text-sm"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={getSession} disabled={loading || !sessionId || !accessToken} className="rounded-lg border border-slate-300 py-2 text-sm font-semibold bg-white disabled:opacity-50">Get</button>
              <button type="button" onClick={createJoinToken} disabled={loading || !sessionId || !accessToken} className="rounded-lg border border-slate-300 py-2 text-sm font-semibold bg-white disabled:opacity-50">Get Link</button>
              <button type="button" onClick={startSession} disabled={loading || !sessionId || !accessToken} className="rounded-lg border border-slate-300 py-2 text-sm font-semibold bg-white disabled:opacity-50">Start</button>
              <button type="button" onClick={endSession} disabled={loading || !sessionId || !accessToken} className="rounded-lg border border-slate-300 py-2 text-sm font-semibold bg-white disabled:opacity-50">End</button>
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={openMeeting}
                disabled={!joinUrl}
                className="w-full rounded-lg bg-[#0b9385] py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Join Meeting
              </button>
              {joinUrl && (
                <p className="text-xs text-slate-500 break-all">
                  Meeting URL: {joinUrl}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 text-slate-100 p-6 mt-6 shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">Last API Result</h3>
          <pre className="text-xs overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
        </div>
      </div>
      </main>
    </div>
  );
}
