import React, { useState } from "react";
import Api from "../core/api";
import DashboardLayout from "../layouts/DashboardLayout";

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
    <DashboardLayout navigate={navigate} pageName="Book Appointment">
        <header className="sticky top-0 w-full flex items-center gap-3 px-0 h-16 bg-white/80 backdrop-blur-md z-50 shadow-sm">
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

        <div className="max-w-2xl mx-auto space-y-6">
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
    </DashboardLayout>
  );
}
