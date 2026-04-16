import React, { useState, useEffect } from "react";
import Api from "../core/api";

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function DoctorProfile({ navigate }) {
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = sessionStorage.getItem("accessToken");
  const routePath = window.location.hash.replace("#", "").split("?")[0];
  const doctorId = routePath.split("/")[2];

  const goTo = (path) => {
    if (navigate) navigate(path);
    else window.location.hash = path;
  };

  useEffect(() => {
    if (!doctorId) {
      setError("Invalid doctor ID.");
      setLoading(false);
      return;
    }
    if (!token) {
      goTo("/login");
      return;
    }
    const load = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          Api.get(`/api/v1/doctors/${doctorId}`, token),
          Api.get(`/api/v1/doctors/${doctorId}/availability-slots`, token),
        ]);
        if (dRes.status === 200) {
          setDoctor(dRes.body?.doctor);
        } else {
          setError("Doctor not found.");
          setLoading(false);
          return;
        }
        if (sRes.status === 200) {
          setSlots(
            (sRes.body?.slots || []).filter(
              (s) => s.slot_status === "available",
            ),
          );
        }
      } catch {
        setError("Network error. Please check your connection.");
      }
      setLoading(false);
    };
    load();
  }, [doctorId]);

  const logout = async () => {
    const rt = sessionStorage.getItem("refreshToken");
    if (rt)
      try {
        await Api.post("/api/v1/auth/logout", { refreshToken: rt });
      } catch {}
    sessionStorage.clear();
    navigate("/login");
  };

  const bookSlot = (slot) => {
    const params = new URLSearchParams({
      doctorId: doctor.doctor_id,
      slotId: slot.slot_id,
      slotDate: slot.slot_date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      doctorName: doctor.full_name,
    });
    navigate(`/book?${params.toString()}`);
  };

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
            className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
            onClick={() => navigate("/appointments")}
          >
            <span className="material-symbols-outlined">event</span>
            <span className="font-semibold text-sm">Appointments</span>
          </a>
          <a
            className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer"
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
            onClick={() => navigate("/doctors")}
            className="text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-black text-[#0b9385] tracking-tight">
            {doctor ? doctor.full_name : "Doctor Profile"}
          </h2>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
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
            </div>
          )}

          {!loading && !error && doctor && (
            <div className="space-y-8">
              {/* Doctor info card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-4xl shrink-0">
                    {doctor.full_name
                      ? doctor.full_name.charAt(0).toUpperCase()
                      : "D"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                          {doctor.full_name}
                        </h2>
                        <p className="text-primary font-semibold">
                          {doctor.specialization}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                          doctor.verification_status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {doctor.verification_status}
                      </span>
                    </div>

                    {doctor.bio && (
                      <p className="text-slate-600 mb-5 leading-relaxed">
                        {doctor.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-6 text-sm">
                      {doctor.experience_years > 0 && (
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-primary text-base">
                            workspace_premium
                          </span>
                          {doctor.experience_years} years experience
                        </span>
                      )}
                      {doctor.consultation_fee > 0 && (
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-primary text-base">
                            payments
                          </span>
                          Consultation fee:{" "}
                          <span className="font-bold text-slate-900">
                            LKR{" "}
                            {Number(doctor.consultation_fee).toLocaleString()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Available slots */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      calendar_month
                    </span>
                    Available Slots
                  </h3>
                  <span className="text-sm text-slate-400 font-medium">
                    {slots.length} available
                  </span>
                </div>

                {slots.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <span className="material-symbols-outlined text-5xl block mb-3">
                      event_busy
                    </span>
                    <p className="font-medium">
                      No available slots at the moment.
                    </p>
                    <p className="text-sm mt-1">
                      Check back later or search for another doctor.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.slot_id}
                        className="border border-slate-100 rounded-2xl p-5 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-primary text-sm">
                            calendar_today
                          </span>
                          <p className="font-bold text-slate-900 text-sm">
                            {formatDate(slot.slot_date)}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 pl-6">
                          {formatTime(slot.start_time)} –{" "}
                          {formatTime(slot.end_time)}
                        </p>
                        <button
                          onClick={() => bookSlot(slot)}
                          className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-opacity-90 transition-colors"
                        >
                          Book this Slot
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
