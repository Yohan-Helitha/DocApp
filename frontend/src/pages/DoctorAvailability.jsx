import React, { useEffect, useState } from "react";
import Api from "../core/api";

const SLOT_COLORS = {
  available: "bg-green-100 text-green-700",
  booked: "bg-blue-100 text-blue-700",
  blocked: "bg-slate-100 text-slate-500",
};

export default function DoctorAvailability({ navigate }) {
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [slotDate, setSlotDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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

  const loadSlots = async (doc) => {
    const res = await Api.get(
      `/api/v1/doctors/${doc.doctor_id}/availability-slots`,
      token,
    );
    if (res.status === 200) setSlots(res.body?.slots || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        let userId = "";
        try {
          userId = JSON.parse(atob(token.split(".")[1])).sub;
        } catch {}
        const dRes = await Api.get("/api/v1/doctors", token);
        const me = (dRes.body?.doctors || []).find((d) => d.user_id === userId);
        if (me) {
          setDoctor(me);
          await loadSlots(me);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!slotDate || !startTime || !endTime) {
      setError("All fields are required.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }
    setFormLoading(true);
    try {
      const res = await Api.post(
        `/api/v1/doctors/${doctor.doctor_id}/availability-slots`,
        { slot_date: slotDate, start_time: startTime, end_time: endTime },
        token,
      );
      if (res.status === 201 || res.status === 200) {
        setSuccess("Slot added successfully.");
        setSlotDate("");
        setStartTime("");
        setEndTime("");
        await loadSlots(doctor);
      } else {
        setError(res.body?.message || "Failed to add slot.");
      }
    } catch {
      setError("An error occurred.");
    }
    setFormLoading(false);
  };

  const handleDeleteSlot = async (slotId) => {
    setError("");
    setSuccess("");
    try {
      const res = await Api.delete(
        `/api/v1/doctors/${doctor.doctor_id}/availability-slots/${slotId}`,
        token,
      );
      if (res.status === 200 || res.status === 204) {
        setSlots((prev) => prev.filter((s) => s.slot_id !== slotId));
        setSuccess("Slot removed.");
      } else {
        setError(res.body?.message || "Failed to remove slot.");
      }
    } catch {
      setError("An error occurred.");
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return new Date(y, m - 1, day).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (t) => {
    if (!t) return "";
    const [h, min] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${min} ${ampm}`;
  };

  const filteredSlots =
    filterStatus === "all"
      ? slots
      : slots.filter((s) => s.slot_status === filterStatus);

  const pending = slots.filter((s) => s.slot_status === "available").length;

  return (
    <div className="min-h-screen bg-background text-on-background antialiased overflow-x-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-slate-200/50 bg-slate-50 p-4 z-40">
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
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/success/doctor")}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/doctor/appointments")}
          >
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
          </a>
          <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-semibold text-sm">Availability</span>
            {pending > 0 && (
              <span className="ml-auto bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pending}
              </span>
            )}
          </a>
          <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all hover:translate-x-1 duration-200 cursor-pointer">
            <span className="material-symbols-outlined">description</span>
            <span className="font-semibold text-sm">Medical Records</span>
          </a>
          <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all hover:translate-x-1 duration-200 cursor-pointer">
            <span className="material-symbols-outlined">forum</span>
            <span className="font-semibold text-sm">Messages</span>
          </a>
        </nav>
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
          <a className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button
            onClick={logout}
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all w-full text-left"
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
              Availability
            </h2>
            <p className="text-slate-400 font-medium mt-1">
              Manage your open time slots
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

        <div className="grid grid-cols-5 gap-8">
          {/* Add Slot Form */}
          <div className="col-span-5 lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-sm sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  add_circle
                </span>
                Add New Slot
              </h3>
              <form onSubmit={handleAddSlot} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={formLoading || !doctor}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">
                        add
                      </span>
                      Add Slot
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Slot List */}
          <div className="col-span-5 lg:col-span-3">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    calendar_month
                  </span>
                  Your Slots
                  <span className="ml-2 text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                    {slots.length}
                  </span>
                </h3>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">All</option>
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined text-primary text-4xl animate-spin">
                    progress_activity
                  </span>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-5xl block mb-3">
                    event_busy
                  </span>
                  <p className="font-medium">
                    {filterStatus === "all"
                      ? "No slots yet. Add your first slot."
                      : `No ${filterStatus} slots.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSlots.map((slot) => (
                    <div
                      key={slot.slot_id}
                      className="flex items-center justify-between border border-slate-100 rounded-2xl px-5 py-4 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-lg">
                            schedule
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {formatDate(slot.slot_date)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatTime(slot.start_time)} –{" "}
                            {formatTime(slot.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${SLOT_COLORS[slot.slot_status] || "bg-slate-100 text-slate-500"}`}
                        >
                          {slot.slot_status}
                        </span>
                        {slot.slot_status === "available" && (
                          <button
                            onClick={() => handleDeleteSlot(slot.slot_id)}
                            title="Remove slot"
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
