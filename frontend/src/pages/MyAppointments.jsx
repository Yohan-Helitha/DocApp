import React, { useState, useEffect } from "react";
import Api from "../core/api";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const TABS = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

export default function MyAppointments({ navigate }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [cancelling, setCancelling] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  const token = sessionStorage.getItem("accessToken");
  let userId = "";
  try {
    userId = JSON.parse(atob(token.split(".")[1])).sub;
  } catch {}

  const fetchAppointments = async () => {
    if (!userId) {
      setError("Not authenticated. Please log in.");
      setLoading(false);
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await Api.get(`/api/v1/appointments/patients/${userId}`, token);
      if (r.status === 200) {
        setAppointments(r.body?.appointments || []);
      } else {
        setError("Could not load appointments.");
      }
    } catch {
      setError("Network error.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const cancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?"))
      return;
    setCancelling(appointmentId);
    try {
      const r = await Api.delete(
        `/api/v1/appointments/${appointmentId}`,
        token,
      );
      if (r.status === 200) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.appointment_id === appointmentId
              ? { ...a, appointment_status: "cancelled" }
              : a,
          ),
        );
      } else {
        alert(r.body?.error || "Failed to cancel appointment.");
      }
    } catch {
      alert("Network error.");
    }
    setCancelling(null);
  };

  const openReschedule = async (appointment) => {
    setSelectedSlot(null);
    setRescheduleError("");
    setRescheduleTarget(appointment);
    setSlotsLoading(true);
    try {
      const r = await Api.get(
        `/api/v1/doctors/${appointment.doctor_id}/availability-slots`,
        token,
      );
      setRescheduleSlots(
        r.status === 200
          ? (r.body?.slots || []).filter((s) => s.slot_status === "available")
          : [],
      );
    } catch {
      setRescheduleSlots([]);
    }
    setSlotsLoading(false);
  };

  const confirmReschedule = async () => {
    if (!selectedSlot) return;
    setRescheduling(true);
    setRescheduleError("");
    try {
      const r = await Api.put(
        `/api/v1/appointments/${rescheduleTarget.appointment_id}`,
        { slot_id: selectedSlot },
        token,
      );
      if (r.status === 200) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.appointment_id === rescheduleTarget.appointment_id
              ? { ...a, slot_id: selectedSlot }
              : a,
          ),
        );
        setRescheduleTarget(null);
      } else {
        setRescheduleError(
          r.body?.message || r.body?.error || "Failed to reschedule.",
        );
      }
    } catch {
      setRescheduleError("Network error. Please try again.");
    }
    setRescheduling(false);
  };

  const fmtDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return new Date(y, m - 1, day).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const fmtTime = (t) => {
    if (!t) return "";
    const [h, min] = t.split(":");
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${min} ${hour >= 12 ? "PM" : "AM"}`;
  };

  const logout = async () => {
    const rt = sessionStorage.getItem("refreshToken");
    if (rt)
      try {
        await Api.post("/api/v1/auth/logout", { refreshToken: rt });
      } catch {}
    sessionStorage.clear();
    navigate("/login");
  };

  const filtered =
    filter === "all"
      ? appointments
      : appointments.filter((a) => a.appointment_status === filter);

  return (
    <div className="bg-background text-on-background antialiased">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 bg-slate-50 p-4 z-40">
        <div className="mb-8 px-4 py-2">
          <h1 className="text-lg font-extrabold text-[#0b9385]">
            SmartHealth AI
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Patient Portal
          </p>
        </div>
        <nav className="flex-1 space-y-1">
          <a
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
            onClick={() => navigate("/success/patient")}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
          </a>
          <a
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
            onClick={() => navigate("/doctors")}
          >
            <span className="material-symbols-outlined">person_search</span>
            <span className="font-semibold text-sm">Search Doctors</span>
          </a>
          <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer">
            <span className="material-symbols-outlined">description</span>
            <span className="font-semibold text-sm">Medical Records</span>
          </a>
          <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer">
            <span className="material-symbols-outlined">notifications</span>
            <span className="font-semibold text-sm">Notifications</span>
          </a>
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-200/50">
          <button
            onClick={logout}
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:ml-64 min-h-screen">
        <header className="sticky top-0 w-full flex justify-between items-center px-8 h-16 bg-white/80 backdrop-blur-md z-50 shadow-sm">
          <h2 className="text-xl font-black text-[#0b9385] tracking-tight">
            My Appointments
          </h2>
          <button
            onClick={() => navigate("/doctors")}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-opacity-90 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Book New
          </button>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                  filter === tab
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-slate-500 border border-slate-100 hover:border-primary/30"
                }`}
              >
                {tab}
                {tab !== "all" && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    (
                    {
                      appointments.filter((a) => a.appointment_status === tab)
                        .length
                    }
                    )
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-24">
              <span className="material-symbols-outlined text-primary text-5xl animate-spin">
                progress_activity
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-red-400 text-5xl block mb-3">
                error
              </span>
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={fetchAppointments}
                className="mt-4 px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-24 text-slate-400">
              <span className="material-symbols-outlined text-6xl block mb-4">
                event_busy
              </span>
              <p className="text-lg font-medium">
                No {filter !== "all" ? filter : ""} appointments found.
              </p>
              <button
                onClick={() => navigate("/doctors")}
                className="mt-5 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl"
              >
                Browse Doctors
              </button>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map((a) => (
                <div
                  key={a.appointment_id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        STATUS_COLORS[a.appointment_status]?.split(" ")[0] ||
                        "bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        event
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-0.5">
                        Appointment
                      </p>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        #{a.appointment_id.slice(0, 8).toUpperCase()}
                      </p>
                      {a.reason_for_visit && (
                        <p className="text-sm text-slate-500 mt-0.5 max-w-xs">
                          {a.reason_for_visit}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Booked{" "}
                        {new Date(a.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full ${
                        STATUS_COLORS[a.appointment_status] ||
                        "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.appointment_status}
                    </span>
                    {a.appointment_status === "pending" && (
                      <button
                        onClick={() => openReschedule(a)}
                        className="px-4 py-2 text-xs font-bold text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">
                          schedule
                        </span>
                        Reschedule
                      </button>
                    )}
                    {(a.appointment_status === "pending" ||
                      a.appointment_status === "confirmed") && (
                      <button
                        onClick={() => cancel(a.appointment_id)}
                        disabled={cancelling === a.appointment_id}
                        className="px-4 py-2 text-xs font-bold text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {cancelling === a.appointment_id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    )}
                    {a.appointment_status === "confirmed" && (
                      <button
                        onClick={() =>
                          navigate(
                            `/telemedicine?appointmentId=${a.appointment_id}`,
                          )
                        }
                        className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-opacity-90 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">
                          video_call
                        </span>
                        Join Session
                      </button>
                    )}
                    {a.appointment_status === "completed" && (
                      <button
                        onClick={() =>
                          navigate(`/prescriptions?patientId=${userId}`)
                        }
                        className="px-4 py-2 text-xs font-bold text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">
                          description
                        </span>
                        View Prescriptions
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                Reschedule Appointment
              </h3>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-sm text-slate-500 mb-4">
                Select a new available slot. Current appointment{" "}
                <span className="font-mono font-bold">
                  #{rescheduleTarget.appointment_id.slice(0, 8).toUpperCase()}
                </span>{" "}
                will be updated.
              </p>

              {rescheduleError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                  {rescheduleError}
                </div>
              )}

              {slotsLoading ? (
                <div className="flex justify-center py-8">
                  <span className="material-symbols-outlined text-primary text-4xl animate-spin">
                    progress_activity
                  </span>
                </div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-2">
                    event_busy
                  </span>
                  <p className="text-sm font-medium">
                    No available slots for this doctor.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rescheduleSlots.map((s) => (
                    <button
                      key={s.slot_id}
                      onClick={() => setSelectedSlot(s.slot_id)}
                      className={`w-full text-left border rounded-xl px-4 py-3 transition-all ${
                        selectedSlot === s.slot_id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-slate-100 hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">
                        {fmtDate(s.slot_date)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setRescheduleTarget(null)}
                className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmReschedule}
                disabled={!selectedSlot || rescheduling}
                className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {rescheduling ? (
                  <span className="material-symbols-outlined animate-spin text-lg">
                    progress_activity
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
