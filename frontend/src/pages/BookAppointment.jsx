import React, { useState } from "react";
import Api from "../core/api";

const formatTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function BookAppointment({ navigate }) {
  const token = sessionStorage.getItem("accessToken");

  const hash = window.location.hash.replace("#", "");
  const queryStr = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(queryStr);

  const doctorId = params.get("doctorId") || "";
  const slotId = params.get("slotId") || "";
  const slotDate = params.get("slotDate") || "";
  const startTime = params.get("startTime") || "";
  const endTime = params.get("endTime") || "";
  const doctorName = params.get("doctorName") || "Doctor";

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState(""); // 'success' | 'error'
  const [accessDenied, setAccessDenied] = useState(false);

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  React.useEffect(() => {
    if (!token) {
      goTo("/login");
      return;
    }
    let role = "";
    try {
      role = JSON.parse(atob(token.split(".")[1])).role;
    } catch {}
    if (role && role !== "patient") setAccessDenied(true);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) {
      setMsg("Your session has expired. Please sign in again.");
      setMsgType("error");
      navigate("/login");
      return;
    }
    if (!doctorId || !slotId) {
      setMsg("Missing booking information. Please go back and select a slot.");
      setMsgType("error");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const r = await Api.post(
        "/api/v1/appointments",
        {
          doctor_id: doctorId,
          slot_id: slotId,
          reason_for_visit: reason || undefined,
        },
        token,
      );

      if (r.status === 201) {
        setMsg(
          "Appointment booked successfully! Redirecting to your appointments...",
        );
        setMsgType("success");
        setTimeout(() => navigate("/appointments"), 1800);
      } else {
        setMsg(r.body?.error || "Booking failed. Please try again.");
        setMsgType("error");
      }
    } catch {
      setMsg("Network error. Please try again.");
      setMsgType("error");
    }
    setLoading(false);
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
          <p className="text-slate-500 mt-2">This page is for patients only.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

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
          <a
            className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/appointments")}
          >
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
        <header className="sticky top-0 w-full flex items-center gap-3 px-8 h-16 bg-white/80 backdrop-blur-md z-50 shadow-sm">
          <button
            onClick={() =>
              doctorId ? navigate(`/doctors/${doctorId}`) : navigate("/doctors")
            }
            className="text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-black text-[#0b9385] tracking-tight">
            Book Appointment
          </h2>
        </header>

        <div className="p-8 max-w-2xl mx-auto space-y-6">
          {/* Booking summary */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                info
              </span>
              Booking Summary
            </h3>
            <div className="space-y-1 divide-y divide-slate-50">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Doctor</span>
                <span className="text-sm font-bold text-slate-900">
                  {doctorName}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Date</span>
                <span className="text-sm font-bold text-slate-900">
                  {slotDate
                    ? new Date(slotDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-500">Time</span>
                <span className="text-sm font-bold text-slate-900">
                  {startTime && endTime
                    ? `${formatTime(startTime)} – ${formatTime(endTime)}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Reason form */}
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                edit_note
              </span>
              Reason for Visit
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Describe your symptoms or reason{" "}
                <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="e.g. Persistent headache for 3 days, mild fever..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>

            {msg && (
              <div
                className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 ${
                  msgType === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <span className="material-symbols-outlined text-sm mt-0.5">
                  {msgType === "success" ? "check_circle" : "error"}
                </span>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || msgType === "success"}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
              {loading ? "Booking..." : "Confirm Appointment"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
