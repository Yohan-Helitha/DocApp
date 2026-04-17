import React, { useEffect, useState } from "react";
import Api from "../core/api";

const formatDate = (d) => {
  if (!d) return null;
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (t) => {
  if (!t) return null;
  const [h, min] = t.slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${min} ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100  text-green-700",
  completed: "bg-blue-100   text-blue-700",
  rejected: "bg-red-100    text-red-700",
  cancelled: "bg-slate-100  text-slate-500",
};

const FILTERS = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "rejected",
  "cancelled",
];

export default function DoctorAppointments({ navigate }) {
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null); // null | "none" | "pending" | "rejected"

  const token = sessionStorage.getItem("accessToken");

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  const logout = async () => {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await Api.post("/api/v1/auth/logout", { refreshToken });
      } catch (e) {}
    }
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    goTo("/login");
  };

  useEffect(() => {
    const load = async () => {
      setError("");
      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setLoading(false);
        goTo("/login");
        return;
      }

      try {
        let userId = "";
        try {
          userId = JSON.parse(atob(token.split(".")[1])).sub;
        } catch {
          setError("Invalid login session. Please sign in again.");
          setLoading(false);
          goTo("/login");
          return;
        }

        let role = "";
        try {
          role = JSON.parse(atob(token.split(".")[1])).role;
        } catch {}
        if (role && role !== "doctor") {
          setLoading(false);
          setAccessDenied(true);
          return;
        }

        const dRes = await Api.get("/api/v1/doctors", token);
        if (dRes.status !== 200) {
          setError(
            dRes.body?.message ||
              dRes.body?.error ||
              `Failed to load doctor profile (${dRes.status}).`,
          );
          setLoading(false);
          return;
        }

        const me = (dRes.body?.doctors || []).find((d) => d.user_id === userId);
        if (!me) {
          // Check if a profile exists with non-approved status
          const ownRes = await Api.get("/api/v1/doctors/me", token);
          if (ownRes.status === 200 && ownRes.body?.doctor) {
            setProfileStatus(ownRes.body.doctor.verification_status); // "pending" | "rejected"
          } else {
            setProfileStatus("none");
          }
          setLoading(false);
          return;
        }

        setDoctor(me);
        const aRes = await Api.get(
          `/api/v1/appointments/doctors/${me.doctor_id}`,
          token,
        );
        if (aRes.status === 200) {
          setAppointments(aRes.body?.appointments || []);
        } else {
          setError(
            aRes.body?.message ||
              aRes.body?.error ||
              `Failed to load appointments (${aRes.status}).`,
          );
        }
      } catch {
        setError("Failed to load appointments. Please try again.");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleComplete = async (appointmentId) => {
    setError("");
    setSuccess("");
    setActionLoading((prev) => ({ ...prev, [appointmentId]: "complete" }));
    try {
      const res = await Api.put(
        `/api/v1/appointments/${appointmentId}/status`,
        { status: "completed" },
        token,
      );
      if (res.status === 200) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.appointment_id === appointmentId
              ? { ...a, appointment_status: "completed" }
              : a,
          ),
        );
        setSuccess("Appointment marked as completed.");
      } else {
        setError(res.body?.message || res.body?.error || "Action failed.");
      }
    } catch {
      setError("An error occurred.");
    }
    setActionLoading((prev) => ({ ...prev, [appointmentId]: undefined }));
  };

  const handleDecision = async (appointmentId, decision) => {
    setError("");
    setSuccess("");
    setActionLoading((prev) => ({ ...prev, [appointmentId]: decision }));
    try {
      const res = await Api.put(
        `/api/v1/appointments/${appointmentId}/doctor-decision`,
        { decision },
        token,
      );
      if (res.status === 200) {
        const newStatus = decision === "accept" ? "confirmed" : "rejected";
        setAppointments((prev) =>
          prev.map((a) =>
            a.appointment_id === appointmentId
              ? { ...a, appointment_status: newStatus }
              : a,
          ),
        );
        setSuccess(`Appointment ${newStatus}.`);
      } else {
        setError(res.body?.message || "Action failed.");
      }
    } catch {
      setError("An error occurred.");
    }
    setActionLoading((prev) => ({ ...prev, [appointmentId]: undefined }));
  };

  const pending = appointments.filter(
    (a) => a.appointment_status === "pending",
  );

  const filtered =
    filter === "all"
      ? appointments
      : appointments.filter((a) => a.appointment_status === filter);

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-5xl text-red-400 block">
            lock
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-4">
            Access Denied
          </h2>
          <p className="text-slate-500 mt-2">This page is for doctors only.</p>
          <button
            onClick={() => goTo("/")}
            className="mt-6 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (profileStatus !== null) {
    const isPending = profileStatus === "pending";
    const isNone = profileStatus === "none";
    return (
      <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
        <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 p-4 z-40">
          <div className="mb-10 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">
                  clinical_notes
                </span>
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-[#0b9385]">
                  SmartHealth AI
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Doctor Portal
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            <a
              className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
              onClick={() => goTo("/success/doctor")}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-semibold text-sm">Overview</span>
            </a>
            <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
              <span className="material-symbols-outlined">event</span>
              <span className="font-semibold text-sm">Appointments</span>
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
              onClick={() => goTo("/doctor/availability")}
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="font-semibold text-sm">Availability</span>
            </a>
            <button
              type="button"
              onClick={() => goTo("/telemedicine")}
              className="w-full text-left text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200"
            >
              <span
                className="material-symbols-outlined"
                data-icon="video_chat"
              >
                video_chat
              </span>
              <span className="font-semibold text-sm">Telemedicine</span>
            </button>
          </nav>
          <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
            <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
              <span className="material-symbols-outlined">help</span>
              <span className="font-semibold text-sm">Help Center</span>
            </a>
            <button
              onClick={logout}
              className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all w-full text-left"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-semibold text-sm">Logout</span>
            </button>
          </div>
        </aside>
        <main className="md:ml-64 p-8 min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: isNone
                  ? "rgb(241 245 249)"
                  : isPending
                    ? "rgb(254 249 195)"
                    : "rgb(254 226 226)",
              }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{
                  color: isNone ? "#64748b" : isPending ? "#ca8a04" : "#dc2626",
                }}
              >
                {isNone ? "person_off" : isPending ? "schedule" : "cancel"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {isNone
                ? "No Doctor Profile Found"
                : isPending
                  ? "Profile Verification Pending"
                  : "Profile Not Approved"}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {isNone
                ? "You haven't set up your doctor profile yet. Please visit the Overview page to create your profile first."
                : isPending
                  ? "Your profile is awaiting admin verification. You'll have full access to this page once your profile is approved."
                  : "Your profile application was not approved. Please contact platform support for assistance."}
            </p>
            <button
              onClick={() => goTo("/success/doctor")}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Go to Overview
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950 p-4 z-40">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">
                clinical_notes
              </span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0b9385]">
                SmartHealth AI
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Doctor Portal
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/success/doctor")}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
            {pending.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/doctor/availability")}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-semibold text-sm">Availability</span>
          </a>
          <button
            type="button"
            onClick={() => goTo("/telemedicine")}
            className="w-full text-left text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200"
          >
            <span className="material-symbols-outlined" data-icon="video_chat">
              video_chat
            </span>
            <span className="font-semibold text-sm">Telemedicine</span>
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button
            onClick={logout}
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-64 p-8 min-h-screen">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Appointments
            </h2>
            <p className="text-slate-400 font-medium mt-1">
              {doctor ? `Dr. ${doctor.full_name}` : ""}
              {pending.length > 0 && (
                <span className="ml-2 text-xs font-bold text-red-500">
                  {pending.length} pending
                </span>
              )}
            </p>
          </div>
          {doctor && (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-lg">
              {doctor.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </header>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50   border border-red-200   text-red-700   rounded-2xl px-5 py-4 text-sm font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-5 py-4 text-sm font-medium">
            {success}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {f}
              {f === "pending" && pending.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointment List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">
              progress_activity
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">
              event_busy
            </span>
            <p className="text-slate-400 font-medium">
              No {filter === "all" ? "" : filter} appointments found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((appt) => (
              <div
                key={appt.appointment_id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Left: ID + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    {/* Bug 6 fix: show patient name instead of UUID */}
                    <span className="font-bold text-slate-900 text-sm">
                      {appt.patient_name
                        ? appt.patient_name
                        : appt.patient_email
                          ? appt.patient_email.split("@")[0]
                          : `Patient #${appt.patient_id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_COLORS[appt.appointment_status] || "bg-slate-100 text-slate-500"}`}
                    >
                      {appt.appointment_status}
                    </span>
                  </div>
                  {/* Bug 11 fix: show slot date and time */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="material-symbols-outlined text-sm">
                      calendar_today
                    </span>
                    {appt.slot_date ? (
                      <span>
                        {formatDate(appt.slot_date)}
                        {appt.start_time && (
                          <span className="font-semibold text-slate-700">
                            {" "}
                            &bull; {formatTime(appt.start_time)}
                            {appt.end_time && ` – ${formatTime(appt.end_time)}`}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>
                        {new Date(appt.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  {appt.reason_for_visit && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="font-semibold text-slate-600">
                        Reason:
                      </span>{" "}
                      {appt.reason_for_visit}
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {appt.appointment_status === "pending" && (
                    <>
                      <button
                        disabled={!!actionLoading[appt.appointment_id]}
                        onClick={() =>
                          handleDecision(appt.appointment_id, "accept")
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading[appt.appointment_id] === "accept" ? (
                          <span className="material-symbols-outlined animate-spin text-sm">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">
                            check_circle
                          </span>
                        )}
                        Accept
                      </button>
                      <button
                        disabled={!!actionLoading[appt.appointment_id]}
                        onClick={() =>
                          handleDecision(appt.appointment_id, "reject")
                        }
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors border border-red-200 disabled:opacity-50"
                      >
                        {actionLoading[appt.appointment_id] === "reject" ? (
                          <span className="material-symbols-outlined animate-spin text-sm">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">
                            cancel
                          </span>
                        )}
                        Reject
                      </button>
                    </>
                  )}
                  {appt.appointment_status === "confirmed" &&
                    appt.payment_status !== "paid" && (
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        Awaiting Payment
                      </span>
                    )}
                  {appt.appointment_status === "confirmed" &&
                    appt.payment_status === "paid" && (
                      <>
                        <button
                          onClick={() =>
                            goTo(
                              `/telemedicine?appointmentId=${appt.appointment_id}`,
                            )
                          }
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-50 text-violet-600 text-xs font-bold hover:bg-violet-500 hover:text-white transition-colors border border-violet-200"
                        >
                          <span className="material-symbols-outlined text-sm">
                            video_call
                          </span>
                          Create Session
                        </button>
                        <button
                          disabled={!!actionLoading[appt.appointment_id]}
                          onClick={() => handleComplete(appt.appointment_id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors border border-blue-200 disabled:opacity-50"
                        >
                          {actionLoading[appt.appointment_id] === "complete" ? (
                            <span className="material-symbols-outlined animate-spin text-sm">
                              progress_activity
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">
                              task_alt
                            </span>
                          )}
                          Mark Complete
                        </button>
                        <button
                          onClick={() =>
                            goTo(
                              `/doctor/prescriptions/new?appointmentId=${appt.appointment_id}&patientId=${appt.patient_id}`,
                            )
                          }
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">
                            medication
                          </span>
                          Write Prescription
                        </button>
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
