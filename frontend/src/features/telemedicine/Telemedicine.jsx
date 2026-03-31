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
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8">
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
    </div>
  );
}
