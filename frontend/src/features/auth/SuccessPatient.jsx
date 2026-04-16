import React, { useEffect, useState } from "react";
import Api from "../../core/api";
import DashboardLayout from "../../layouts/DashboardLayout";

const parseUpcomingDateRange = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!m) return null;
  const day = m[1];
  const start = new Date(`${day}T${m[2]}:00`);
  const end = new Date(`${day}T${m[3]}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
};

const canJoinNowFromUpcoming = (a) => {
  const range = parseUpcomingDateRange(a?.date);
  if (!range) return false;
  const now = new Date();
  return now >= range.start && now <= range.end;
};

export default function PatientDashboard({ navigate }) {
  const [appointments, setAppointments] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = sessionStorage.getItem("accessToken") || "";

        const [a, p, r, n] = await Promise.all([
          Api.get("/api/v1/appointments/upcoming", token)
            .then((res) => (Array.isArray(res?.body) ? res.body : []))
            .catch(() => []),
          Api.get("/api/v1/prescriptions/recent", token)
            .then((res) => (Array.isArray(res?.body) ? res.body : []))
            .catch(() => []),
          Api.get("/api/v1/reports/recent", token)
            .then((res) => (Array.isArray(res?.body) ? res.body : []))
            .catch(() => []),
          Api.get("/api/v1/notifications/latest", token)
            .then((res) => (Array.isArray(res?.body) ? res.body : []))
            .catch(() => []),
        ]);

        if (!mounted) return;

        setAppointments(a);
        setReports(r);
        setNotifications(n);
        setProfile(p);
      } catch (e) {
        console.error("Error fetching dashboard data:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await Api.post("/api/v1/auth/logout", { refreshToken });
      } catch (e) {}
    }
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    if (navigate) navigate("/login");
    else window.location.hash = "/login";
  };

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  return (
    <DashboardLayout navigate={navigate} pageName="Overview">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">
            Welcome back! Here's an overview of your health sessions and
            records.
          </p>
        </div>

        {/* Complete Profile Banner */}
        {!profile && !loading && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-blue-600 text-3xl">
                person
              </span>
              <div>
                <h3 className="font-bold text-blue-900 text-lg">
                  Complete Your Profile
                </h3>
                <p className="text-blue-700 text-sm">
                  Add your personal information to get personalized healthcare
                  recommendations.
                </p>
              </div>
            </div>
            <button
              onClick={() => goTo("/patient/profile")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              Complete Profile
            </button>
          </div>
        )}

        {/* AI Symptom Checker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-primary rounded-xl p-8 text-on-primary shadow-lg">
            <h3 className="text-3xl font-extrabold">
              Feeling unwell? Check your symptoms instantly.
            </h3>
            <p className="text-primary-container font-medium">
              Our AI analysis tool provides clinical-grade preliminary
              assessments in under 2 minutes.
            </p>
            <button
              className="bg-white text-primary px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-primary-container transition-colors mt-4"
              onClick={() => goTo("/symptom-checker")}
            >
              Start AI Assessment
            </button>
          </div>
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
            <h4 className="font-bold text-lg">Quick Find</h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Specialty
                </label>
                <select className="w-full rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-primary">
                  <option>Cardiology</option>
                  <option>Neurology</option>
                  <option>General Practice</option>
                  <option>Pediatrics</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">
                  Date Preference
                </label>
                <input
                  className="w-full rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-primary"
                  type="date"
                />
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
                <div
                  key={a.id || a._id}
                  className="bg-surface-bright rounded-xl p-5 shadow-sm border border-outline-variant/20"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-lg">
                        {a.doctorName || a.doctor}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {a.date || a.time}
                      </p>
                    </div>
                    {(() => {
                      const isTelemed = a.type === "telemedicine";
                      const locked = isTelemed && !canJoinNowFromUpcoming(a);
                      return (
                        <button
                          className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={locked}
                          title={
                            locked
                              ? "You can only join during the appointment time window."
                              : undefined
                          }
                          onClick={() => {
                            if (locked) return;
                            goTo(
                              `/telemedicine?appointmentId=${encodeURIComponent(
                                a.appointment_id || a.id || a._id,
                              )}`,
                            );
                          }}
                        >
                          {a.type === "telemedicine"
                            ? "Join Session"
                            : "View Details"}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No upcoming appointments</p>
          )}
        </section>

        {/* Uploaded Reports */}
        <section>
          <h3 className="text-2xl font-bold">Uploaded Reports</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reports && reports.length ? (
              reports.map((r) => (
                <div
                  key={r.id || r._id}
                  className="bg-white p-4 rounded-xl border border-outline-variant/30"
                >
                  <h5 className="font-bold text-sm">{r.name || r.filename}</h5>
                  <p className="text-xs text-slate-500">{r.date}</p>
                  <div className="flex gap-3 mt-3">
                    <button className="text-primary text-sm font-bold">
                      View
                    </button>
                    <button className="text-slate-400 text-sm font-bold">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No reports uploaded</p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
