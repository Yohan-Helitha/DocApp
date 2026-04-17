import React, { useEffect, useMemo, useState } from 'react';
import Api from '../../core/api';

export default function Telemedicine({ navigate }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [sessions, setSessions] = useState([]);
  const [appointmentCache, setAppointmentCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionSessionId, setActionSessionId] = useState('');
  const [error, setError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinStarted, setJoinStarted] = useState(false);

  const accessToken = useMemo(() => sessionStorage.getItem('accessToken') || '', []);

  const getAppointmentIdFromHash = () => {
    try {
      const hash = window.location.hash || '';
      const query = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(query || '');
      return params.get('appointmentId') || params.get('appointment_id') || '';
    } catch {
      return '';
    }
  };

  const [appointmentId, setAppointmentId] = useState(() => getAppointmentIdFromHash());

  useEffect(() => {
    const onHashChange = () => setAppointmentId(getAppointmentIdFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decodeJwtPayload = (token) => {
    try {
      const parts = String(token || '').split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const getRoleFromToken = () => {
    const token = getAccessToken();
    const payload = decodeJwtPayload(token);
    const role = String(payload?.role || '').toLowerCase();
    return role === 'doctor' || role === 'admin' ? 'doctor' : 'patient';
  };

  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await Api.post('/api/v1/auth/logout', { refreshToken });
      } catch {}
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    localStorage.removeItem('patientId');
    localStorage.removeItem('requiresProfileCompletion');
    if (navigate) navigate('/login');
    else window.location.hash = '/login';
  };

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  const redirectToPatientDashboard = (message) => {
    setJoinError(message || 'Redirecting to dashboard…');
    // Small delay so the user can read the reason.
    setTimeout(() => {
      goTo('/success/patient');
    }, 1500);
  };

  const getAccessToken = () => sessionStorage.getItem('accessToken') || '';

  const authedFetch = async (path, method, body) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch(Api.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  };

  const fmtShort = (value) => {
    if (!value) return '—';
    const s = String(value);
    return s.length > 10 ? `${s.slice(0, 8)}…` : s;
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const parseTimeToHms = (time) => {
    if (!time) return null;
    const t = String(time).trim();
    const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = Number(m[3] || 0);
    if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
    return { hh, mm, ss };
  };

  const buildLocalDateTime = (slotDate, time) => {
    if (!slotDate || !time) return null;
    const dateStr = String(slotDate).slice(0, 10);
    const hms = parseTimeToHms(time);
    if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(dateStr) || !hms) return null;
    const hh = String(hms.hh).padStart(2, '0');
    const mm = String(hms.mm).padStart(2, '0');
    const ss = String(hms.ss).padStart(2, '0');
    const d = new Date(`${dateStr}T${hh}:${mm}:${ss}`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const fmtSlotDate = (slotDate) => {
    if (!slotDate) return '—';
    try {
      const dateStr = String(slotDate).slice(0, 10);
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const fmtTime = (time) => {
    const hms = parseTimeToHms(time);
    if (!hms) return '—';
    try {
      const d = new Date();
      d.setHours(hms.hh, hms.mm, 0, 0);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const isWithinSlotWindow = (appt) => {
    const start = buildLocalDateTime(appt?.slot_date, appt?.start_time);
    const end = buildLocalDateTime(appt?.slot_date, appt?.end_time);
    if (!start || !end) return false;
    const now = new Date();
    return now >= start && now <= end;
  };

  const getAppointment = async (appointmentId) => {
    if (!appointmentId) return null;
    if (appointmentCache[appointmentId]) return appointmentCache[appointmentId];

    const res = await authedFetch(`/api/v1/appointments/${appointmentId}`, 'GET');
    if (res.status >= 200 && res.status < 300 && res.body && res.body.appointment) {
      const appointment = res.body.appointment;
      setAppointmentCache((prev) => ({ ...prev, [appointmentId]: appointment }));
      return appointment;
    }
    return null;
  };

  const loadSessions = async (tab) => {
    if (!getAccessToken()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authedFetch(`/api/v1/telemedicine/sessions?status=${encodeURIComponent(tab)}`, 'GET');
      if (res.status >= 200 && res.status < 300 && res.body && Array.isArray(res.body.sessions)) {
        const list = res.body.sessions;
        setSessions(list);

        // Best-effort appointment enrichment for patient + slot/date display
        const uniqueAppointmentIds = Array.from(
          new Set(list.map((s) => s && s.appointment_id).filter(Boolean)),
        );
        uniqueAppointmentIds.forEach((id) => {
          if (!appointmentCache[id]) getAppointment(id);
        });
        return;
      }
      setSessions([]);
      setError((res.body && res.body.error) || 'failed_to_load_sessions');
    } catch (e) {
      setSessions([]);
      setError(e?.message || 'failed_to_load_sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appointmentId) return;
    loadSessions(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, appointmentId]);

  useEffect(() => {
    const run = async () => {
      if (!appointmentId) return;
      if (!getAccessToken()) return;
      if (joinStarted) return;

      setJoinStarted(true);
      setJoinLoading(true);
      setJoinError('');
      setJoinUrl('');

      try {
        // create or return existing session for this appointment
        const createRes = await authedFetch('/api/v1/telemedicine/sessions', 'POST', {
          appointment_id: appointmentId,
          provider: 'jitsi'
        });

        const sessionId = createRes?.body?.session?.session_id;
        if (!(createRes.status >= 200 && createRes.status < 300) || !sessionId) {
          const errorCode = (createRes.body && createRes.body.error) || 'failed_to_create_session';
          if (errorCode === 'appointment_not_confirmed') {
            const appt = await getAppointment(appointmentId);
            const st = String(appt?.appointment_status || '').toLowerCase();
            if (st === 'rejected' || st === 'cancelled') {
              redirectToPatientDashboard('Appointment was declined. Redirecting to dashboard…');
              return;
            }
          }

          setJoinError(errorCode);
          return;
        }

        const role = getRoleFromToken();
        if (role === 'doctor') {
          // Doctor: only create the session record; do NOT auto-start/open video.
          goTo('/telemedicine');
          return;
        }

        // Patient: join existing session (only allowed during the appointment window).
        const joinRes = await authedFetch(`/api/v1/telemedicine/sessions/${sessionId}/join-token`, 'POST', {
          role
        });

        const url = joinRes?.body?.joinUrl;
        if (!(joinRes.status >= 200 && joinRes.status < 300) || !url) {
          const errorCode = (joinRes.body && joinRes.body.error) || 'failed_to_get_link';
          if (errorCode === 'session_ended') {
            redirectToPatientDashboard('This session has already ended. Redirecting to dashboard…');
            return;
          }

          if (errorCode === 'appointment_not_confirmed') {
            const appt = await getAppointment(appointmentId);
            const st = String(appt?.appointment_status || '').toLowerCase();
            if (st === 'rejected' || st === 'cancelled') {
              redirectToPatientDashboard('Appointment was declined. Redirecting to dashboard…');
              return;
            }
          }

          setJoinError(errorCode);
          return;
        }

        setJoinUrl(url);
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          setJoinError('popup_blocked_open_link_below');
        }
      } catch (e) {
        setJoinError(e?.message || 'failed_to_join_session');
      } finally {
        setJoinLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, joinStarted]);

  const getLink = async (session) => {
    if (!session || !session.session_id) return;
    setActionSessionId(session.session_id);
    setError('');
    try {
      const role = getRoleFromToken();
      const res = await authedFetch(`/api/v1/telemedicine/sessions/${session.session_id}/join-token`, 'POST', {
        role
      });
      const url = res && res.body && res.body.joinUrl;
      if (res.status >= 200 && res.status < 300 && url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setError((res.body && res.body.error) || 'failed_to_get_link');
      }
    } catch (e) {
      setError(e?.message || 'failed_to_get_link');
    } finally {
      setActionSessionId('');
    }
  };

  const start = async (session) => {
    if (!session || !session.session_id) return;
    setActionSessionId(session.session_id);
    setError('');
    try {
      const startRes = await authedFetch(`/api/v1/telemedicine/sessions/${session.session_id}/start`, 'PUT');
      if (startRes.status < 200 || startRes.status >= 300) {
        setError((startRes.body && startRes.body.error) || 'failed_to_start');
        await loadSessions(activeTab);
        return;
      }

      const role = getRoleFromToken();
      const joinRes = await authedFetch(`/api/v1/telemedicine/sessions/${session.session_id}/join-token`, 'POST', {
        role
      });

      const url = joinRes?.body?.joinUrl;
      if (joinRes.status >= 200 && joinRes.status < 300 && url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setError((joinRes.body && joinRes.body.error) || 'failed_to_get_link');
      }

      await loadSessions(activeTab);
    } catch (e) {
      setError(e?.message || 'failed_to_start');
    } finally {
      setActionSessionId('');
    }
  };

  const end = async (session) => {
    if (!session || !session.session_id) return;
    setActionSessionId(session.session_id);
    setError('');
    try {
      const res = await authedFetch(`/api/v1/telemedicine/sessions/${session.session_id}/end`, 'PUT');
      if (res.status < 200 || res.status >= 300) {
        setError((res.body && res.body.error) || 'failed_to_end');
      }
      await loadSessions(activeTab);
    } catch (e) {
      setError(e?.message || 'failed_to_end');
    } finally {
      setActionSessionId('');
    }
  };

  const remove = async (session) => {
    if (!session || !session.session_id) return;
    setActionSessionId(session.session_id);
    setError('');
    try {
      const res = await authedFetch(`/api/v1/telemedicine/sessions/${session.session_id}`, 'DELETE');
      if (res.status < 200 || res.status >= 300) {
        setError((res.body && res.body.error) || 'failed_to_delete');
      }
      await loadSessions(activeTab);
    } catch (e) {
      setError(e?.message || 'failed_to_delete');
    } finally {
      setActionSessionId('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      {appointmentId && (
        <main className="p-8 min-h-screen">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-extrabold">Telemedicine</h1>
            <p className="text-sm text-slate-500 mt-1">
              Appointment: <span className="font-mono">{fmtShort(appointmentId)}</span>
            </p>

            {!getAccessToken() && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm font-medium">
                No access token in session. Please login first.
              </div>
            )}

            {getAccessToken() && (
              <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-800">
                  {joinLoading ? 'Preparing your video session…' : joinUrl ? 'Session ready.' : 'Waiting…'}
                </div>

                {joinError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 text-sm font-semibold">
                    {joinError}
                  </div>
                )}

                {joinUrl && (
                  <div className="mt-4">
                    <a
                      href={joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0b9385] text-white font-semibold text-sm hover:opacity-95"
                    >
                      Open Session
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {!appointmentId && (
      <>
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

        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={
                  activeTab === 'pending'
                    ? 'px-4 py-2 rounded-lg bg-[#0b9385]/10 text-[#0b9385] font-bold text-sm'
                    : 'px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-sm'
                }
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ended')}
                className={
                  activeTab === 'ended'
                    ? 'px-4 py-2 rounded-lg bg-[#0b9385]/10 text-[#0b9385] font-bold text-sm'
                    : 'px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-sm'
                }
              >
                End
              </button>
            </div>

            <button
              type="button"
              disabled={loading || !getAccessToken()}
              onClick={() => loadSessions(activeTab)}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 pr-4 font-bold">Patient Name</th>
                  <th className="py-3 pr-4 font-bold">Time slot</th>
                  <th className="py-3 pr-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(!sessions || sessions.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-slate-500">
                      {loading ? 'Loading sessions...' : 'No sessions found.'}
                    </td>
                  </tr>
                )}

                {sessions.map((s) => {
                  const appt = appointmentCache[s.appointment_id];
                  const patientLabel = appt ? (appt.patient_name || appt.patient_email || fmtShort(appt.patient_id)) : '—';

                  const timeSlotLabel = appt && appt.slot_date && appt.start_time && appt.end_time
                    ? `${fmtSlotDate(appt.slot_date)} • ${fmtTime(appt.start_time)} - ${fmtTime(appt.end_time)}`
                    : fmtDate(s.created_at);

                  const isBusy = actionSessionId === s.session_id;
                  const isEnded = String(s.session_status || '').toLowerCase() === 'ended';

                  const canJoinNow = appt ? isWithinSlotWindow(appt) : false;
                  const timeLocked = !canJoinNow;
                  const timeLockedTitle = timeLocked ? 'Locked until the appointment time window.' : undefined;

                  return (
                    <tr key={s.session_id} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-slate-800">{patientLabel}</div>
                        <div className="text-xs text-slate-500 font-mono">Appt: {fmtShort(s.appointment_id)}</div>
                      </td>
                      <td className="py-4 pr-4 text-slate-700">{timeSlotLabel}</td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => getLink(s)}
                            disabled={loading || isBusy || !getAccessToken() || timeLocked}
                            title={timeLockedTitle}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            Get Link
                          </button>
                          <button
                            type="button"
                            onClick={() => start(s)}
                            disabled={loading || isBusy || isEnded || !getAccessToken() || timeLocked}
                            title={timeLockedTitle}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            onClick={() => end(s)}
                            disabled={loading || isBusy || isEnded || !getAccessToken()}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            End
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(s)}
                            disabled={loading || isBusy || !getAccessToken()}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </main>
      </>
      )}
    </div>
  );
}
