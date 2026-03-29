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

  const token = sessionStorage.getItem("accessToken");
  let userId = "";
  try {
    userId = JSON.parse(atob(token.split(".")[1])).sub;
  } catch {}

  const fetchAppointments = async () => {
    if (!userId) {
      setError("Not authenticated. Please log in.");
      setLoading(false);
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
