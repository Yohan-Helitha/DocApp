import React, { useEffect, useState } from 'react';
import Api from '../../core/api';

export default function PatientDashboard({ navigate }) {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [a, p, r, n] = await Promise.all([
          Api.get('/api/v1/appointments/upcoming').then((res) => res.data).catch(() => []),
          Api.get('/api/v1/prescriptions/recent').then((res) => res.data).catch(() => []),
          Api.get('/api/v1/reports/recent').then((res) => res.data).catch(() => []),
          Api.get('/api/v1/notifications/latest').then((res) => res.data).catch(() => []),
        ]);
        if (!mounted) return;
        setAppointments(a);
        setPrescriptions(p);
        setReports(r);
        setNotifications(n);
      } catch (e) {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await Api.post('/api/v1/auth/logout', { refreshToken });
      } catch (e) {}
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

  return (
    <div className="bg-background text-on-background antialiased">
      <div className="flex flex-col md:flex-row">
        {/* Side Navigation */}
        <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 bg-slate-50 p-4 z-40">
          <div className="mb-8 px-4 py-2">
            <h1 className="text-lg font-extrabold text-[#0b9385]">Teal Obsidian</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clinical Curator</p>
          </div>
          <nav className="flex-1 space-y-1">
            <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 transition-all" onClick={() => goTo('/dashboard')}>
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-semibold text-sm">Overview</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all" onClick={() => goTo('/appointments')}>
              <span className="material-symbols-outlined">event</span>
              <span className="font-semibold text-sm">Appointments</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all" onClick={() => goTo('/doctors')}>
              <span className="material-symbols-outlined">person_search</span>
              <span className="font-semibold text-sm">Search Doctors</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all" onClick={() => goTo('/reports')}>
              <span className="material-symbols-outlined">description</span>
              <span className="font-semibold text-sm">Medical Records</span>
            </a>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all" onClick={() => goTo('/notifications')}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="font-semibold text-sm">Notifications</span>
            </a>
          </nav>
          <div className="mt-auto space-y-1 pt-4 border-t border-slate-200/50">
            <button className="w-full bg-primary text-on-primary rounded-xl py-3 px-4 mb-4 font-bold text-sm shadow-sm active:scale-95 transition-transform" onClick={() => goTo('/symptom-checker')}>
              Start AI Consultation
            </button>
            <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all" onClick={logout}>
              <span className="material-symbols-outlined">logout</span>
              <span className="font-semibold text-sm">Logout</span>
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 min-h-screen">
          <header className="sticky top-0 w-full flex justify-between items-center px-8 h-16 bg-white/80 backdrop-blur-md z-50 shadow-sm">
            <h2 className="text-xl font-black text-[#0b9385] tracking-tight">Dashboard</h2>
            <button className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600" onClick={logout}>Logout</button>
          </header>

          <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* AI Symptom Checker */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-primary rounded-xl p-8 text-on-primary shadow-lg">
                <h3 className="text-3xl font-extrabold">Feeling unwell? Check your symptoms instantly.</h3>
                <p className="text-primary-container font-medium">Our AI analysis tool provides clinical-grade preliminary assessments in under 2 minutes.</p>
                <button className="bg-white text-primary px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-primary-container transition-colors mt-4" onClick={() => goTo('/symptom-checker')}>
                  Start AI Assessment
                </button>
              </div>
              <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
                <h4 className="font-bold text-lg">Quick Find</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Specialty</label>
                    <select className="w-full rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-primary">
                      <option>Cardiology</option>
                      <option>Neurology</option>
                      <option>General Practice</option>
                      <option>Pediatrics</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Date Preference</label>
                    <input className="w-full rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-primary" type="date" />
                  </div>
                </div>
                <button className="w-full mt-6 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all font-bold rounded-lg text-sm">
                  Find Specialists
                </button>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <section>
              <h3 className="text-2xl font-bold">Upcoming Sessions</h3>
              {appointments && appointments.length ? (
                <div className="space-y-4">
                  {appointments.map((a) => (
                    <div key={a.id || a._id} className="bg-surface-bright rounded-xl p-5 shadow-sm border border-outline-variant/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-lg">{a.doctorName || a.doctor}</h5>
                          <p className="text-xs text-slate-500">{a.date || a.time}</p>
                        </div>
                        <button className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold text-sm" onClick={() => goTo(`/telemedicine/${a.id || a._id}`)}>
                          {a.type === 'telemedicine' ? 'Join Session' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500">No upcoming appointments</p>}
            </section>

            {/* Uploaded Reports */}
            <section>
              <h3 className="text-2xl font-bold">Uploaded Reports</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reports && reports.length ? (
                  reports.map((r) => (
                    <div key={r.id || r._id} className="bg-white p-4 rounded-xl border border-outline-variant/30">
                      <h5 className="font-bold text-sm">{r.name || r.filename}</h5>
                      <p className="text-xs text-slate-500">{r.date}</p>
                      <div className="flex gap-3 mt-3">
                        <button className="text-primary text-sm font-bold">View</button>
                        <button className="text-slate-400 text-sm font-bold">Delete</button>
                      </div>
                    </div>
                  ))
                ) : <p className="text-gray-500">No reports uploaded</p>}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
