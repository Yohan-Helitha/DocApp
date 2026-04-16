import React, { useState, useEffect } from "react";
import Api from "../core/api";
import DashboardLayout from "../layouts/DashboardLayout";

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
  const hh = String(hms.hh).padStart(2, "0");
  const mm = String(hms.mm).padStart(2, "0");
  const ss = String(hms.ss).padStart(2, "0");
  const d = new Date(`${dateStr}T${hh}:${mm}:${ss}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isWithinSlotWindow = (appt) => {
  const start = buildLocalDateTime(appt?.slot_date, appt?.start_time);
  const end = buildLocalDateTime(appt?.slot_date, appt?.end_time);
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now <= end;
};

const formatDeadline = (deadline) => {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d - now;
  if (diffMs <= 0) return "Payment deadline passed";
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const timeStr = d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (diffH > 0) return `Pay by ${timeStr} (${diffH}h ${diffM}m left)`;
  return `Pay by ${timeStr} (${diffM}m left)`;
};

export default function MyAppointments({ navigate }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [cancelling, setCancelling] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(null);
  const [payingNow, setPayingNow] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const token = sessionStorage.getItem("accessToken");
  let userId = "";
  let userRole = "";
  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    userId = decoded.sub;
    userRole = decoded.role;
  } catch {}

  const fetchAppointments = async () => {
    if (!userId) {
      setError("Not authenticated. Please log in.");
      setLoading(false);
      navigate("/login");
      return;
    }
    if (userRole && userRole !== "patient") {
      setLoading(false);
      setAccessDenied(true);
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
    setCancelling(appointmentId);
    setConfirmingCancel(null);
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
        setError(r.body?.error || "Failed to cancel appointment.");
      }
    } catch {
      setError("Network error. Please try again.");
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

  const initiatePayment = (appointmentId, consultationFee) => {
    setPayingNow(appointmentId);
    // Checkout must be submitted from the authorized ngrok domain, not localhost,
    // because PayHere rejects requests from unauthorized origins.
    // Params go inside the hash fragment so PaymentCheckout.jsx can read them
    // via window.location.hash — URL.searchParams would put them before the #.
    const params = new URLSearchParams({
      appointmentId,
      patientId: userId,
      amount: String(Number(consultationFee) || 0),
      currency: "LKR",
    });
    window.location.href = `https://docapp.ngrok.app/#/payments/checkout?${params.toString()}`;
  };

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
    <DashboardLayout navigate={navigate} pageName="Appointments">
      <header className="sticky top-0 w-full flex justify-between items-center px-0 h-16 bg-white/80 backdrop-blur-md z-50 shadow-sm">
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

      <div className="max-w-5xl mx-auto">
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
                    {/* Bug 7 fix: show doctor name instead of raw ID */}
                    <p className="font-bold text-slate-900 text-sm">
                      {a.doctor_name
                        ? `Dr. ${a.doctor_name}`
                        : `#${a.appointment_id.slice(0, 8).toUpperCase()}`}
                    </p>
                    {/* Bug 11 fix: show slot date and time */}
                    {a.slot_date && (
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {formatDate(a.slot_date)}
                        {a.start_time && (
                          <span className="text-slate-500 font-normal">
                            {" "}
                            &bull; {formatTime(a.start_time)}
                            {a.end_time && ` – ${formatTime(a.end_time)}`}
                          </span>
                        )}
                      </p>
                    )}
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
                    (a.appointment_status === "confirmed" &&
                      a.payment_status !== "paid")) &&
                    (confirmingCancel === a.appointment_id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">
                          Cancel this appointment?
                        </span>
                        <button
                          onClick={() => cancel(a.appointment_id)}
                          disabled={cancelling === a.appointment_id}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {cancelling === a.appointment_id
                            ? "Cancelling..."
                            : "Yes, Cancel"}
                        </button>
                        <button
                          onClick={() => setConfirmingCancel(null)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingCancel(a.appointment_id)}
                        disabled={cancelling === a.appointment_id}
                        className="px-4 py-2 text-xs font-bold text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    ))}
                  {a.appointment_status === "confirmed" &&
                    a.payment_status !== "paid" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.payment_deadline &&
                          formatDeadline(a.payment_deadline) && (
                            <span className="text-xs text-amber-600 font-semibold">
                              {formatDeadline(a.payment_deadline)}
                            </span>
                          )}
                        <button
                          onClick={() =>
                            initiatePayment(
                              a.appointment_id,
                              a.consultation_fee,
                            )
                          }
                          disabled={payingNow === a.appointment_id}
                          className="px-4 py-2 text-xs font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {payingNow === a.appointment_id ? (
                            <span className="material-symbols-outlined text-sm animate-spin">
                              progress_activity
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">
                              payments
                            </span>
                          )}
                          Pay Now
                        </button>
                      </div>
                    )}
                  {a.appointment_status === "confirmed" &&
                    a.payment_status === "paid" &&
                    (() => {
                      const canJoinNow = isWithinSlotWindow(a);
                      const locked = !canJoinNow;
                      return (
                        <button
                          onClick={() => {
                            if (locked) return;
                            navigate(
                              `/telemedicine?appointmentId=${a.appointment_id}`,
                            );
                          }}
                          disabled={locked}
                          title={
                            locked
                              ? "You can only join during the appointment time window."
                              : undefined
                          }
                          className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-opacity-90 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-sm">
                            video_call
                          </span>
                          Join Session
                        </button>
                      );
                    })()}
                  {a.appointment_status === "completed" && (
                    <button
                      onClick={() =>
                        navigate(
                          `/prescriptions?patientId=${userId}&appointmentId=${a.appointment_id}`,
                        )
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
    </DashboardLayout>
  );
}
