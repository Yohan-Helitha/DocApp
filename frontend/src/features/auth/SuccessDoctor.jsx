import React, { useEffect, useState } from "react";
import Api from "../../core/api";

export default function SuccessDoctor({ navigate }) {
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createMode, setCreateMode] = useState(false);
  const [pendingMode, setPendingMode] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: "",
    specialization: "",
    license_number: "",
    experience_years: "",
    consultation_fee: "",
    bio: "",
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [specializationLocked, setSpecializationLocked] = useState(false);

  // Edit profile
  const [editProfile, setEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    specialization: "",
    license_number: "",
    experience_years: "",
    consultation_fee: "",
    bio: "",
  });
  const [editProfileError, setEditProfileError] = useState("");
  const [editProfileLoading, setEditProfileLoading] = useState(false);

  const token = sessionStorage.getItem("accessToken");

  useEffect(() => {
    const load = async () => {
      setError("");

      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setLoading(false);
        if (navigate) navigate("/login");
        else window.location.hash = "/login";
        return;
      }

      try {
        let userId = "";
        try {
          userId = JSON.parse(atob(token.split(".")[1])).sub;
        } catch {
          setError("Invalid login session. Please sign in again.");
          setLoading(false);
          if (navigate) navigate("/login");
          else window.location.hash = "/login";
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
          // Profile not in public list — check own profile (any verification status)
          const ownRes = await Api.get("/api/v1/doctors/me", token);
          if (ownRes.status === 200 && ownRes.body?.doctor) {
            // Profile exists but is pending or rejected — show status screen
            setDoctor(ownRes.body.doctor);
            setPendingMode(true);
            setLoading(false);
            return;
          }
          // No profile at all — allow creation; pre-fill from registration data
          try {
            const meRes = await Api.get("/api/v1/auth/me", token);
            if (meRes.status === 200 && meRes.body?.registrationData) {
              const rd = meRes.body.registrationData;
              setCreateForm((f) => ({
                ...f,
                full_name: rd.full_name || "",
                specialization: rd.specialization || "",
              }));
              if (rd.specialization) setSpecializationLocked(true);
            }
          } catch {
            // silently ignore — form will just be blank
          }
          setCreateMode(true);
          setLoading(false);
          return;
        }

        setDoctor(me);
        const aRes = await Api.get(
          `/api/v1/appointments/doctors/${me.doctor_id}`,
          token,
        );
        if (aRes.status === 200) setAppointments(aRes.body?.appointments || []);
        else
          setError(
            aRes.body?.message ||
              aRes.body?.error ||
              `Failed to load appointments (${aRes.status}).`,
          );
      } catch {
        setError("Failed to load dashboard data. Please try again.");
      }
      setLoading(false);
    };
    load();
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

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setCreateError("");
    const {
      full_name,
      specialization,
      license_number,
      experience_years,
      consultation_fee,
      bio,
    } = createForm;
    if (!full_name.trim() || !specialization.trim() || !license_number.trim()) {
      setCreateError(
        "Full name, specialization, and license number are required.",
      );
      return;
    }
    setCreateLoading(true);
    try {
      const body = {
        full_name: full_name.trim(),
        specialization: specialization.trim(),
        license_number: license_number.trim(),
      };
      if (experience_years !== "")
        body.experience_years = Number(experience_years);
      if (consultation_fee !== "")
        body.consultation_fee = Number(consultation_fee);
      if (bio.trim()) body.bio = bio.trim();
      const res = await Api.post("/api/v1/doctors", body, token);
      if (res.status === 201) {
        const newDoctor = res.body?.doctor;
        setDoctor(newDoctor);
        setCreateMode(false);
        setLoading(true);
        const aRes = await Api.get(
          `/api/v1/appointments/doctors/${newDoctor.doctor_id}`,
          token,
        );
        if (aRes.status === 200) setAppointments(aRes.body?.appointments || []);
        setLoading(false);
      } else {
        setCreateError(
          res.body?.message ||
            res.body?.error ||
            `Failed to create profile (${res.status}).`,
        );
      }
    } catch {
      setCreateError("Network error. Please try again.");
    }
    setCreateLoading(false);
  };

  const openEditProfile = () => {
    setEditProfileError("");
    setEditForm({
      full_name: doctor?.full_name || "",
      specialization: doctor?.specialization || "",
      license_number: doctor?.license_number || "",
      experience_years:
        doctor?.experience_years != null ? String(doctor.experience_years) : "",
      consultation_fee:
        doctor?.consultation_fee != null ? String(doctor.consultation_fee) : "",
      bio: doctor?.bio || "",
    });
    setEditProfile(true);
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setEditProfileError("");
    const {
      full_name,
      license_number,
      experience_years,
      consultation_fee,
      bio,
    } = editForm;
    if (!full_name.trim() || !license_number.trim()) {
      setEditProfileError("Full name and license number are required.");
      return;
    }
    setEditProfileLoading(true);
    try {
      const body = {
        full_name: full_name.trim(),
        license_number: license_number.trim(),
      };
      if (experience_years !== "")
        body.experience_years = Number(experience_years);
      if (consultation_fee !== "")
        body.consultation_fee = Number(consultation_fee);
      if (bio.trim()) body.bio = bio.trim();
      else body.bio = "";
      const res = await Api.put(
        `/api/v1/doctors/${doctor.doctor_id}`,
        body,
        token,
      );
      if (res.status === 200) {
        setDoctor(res.body?.doctor);
        setEditProfile(false);
      } else {
        setEditProfileError(
          res.body?.message ||
            res.body?.error ||
            `Failed to update profile (${res.status}).`,
        );
      }
    } catch {
      setEditProfileError("Network error. Please try again.");
    }
    setEditProfileLoading(false);
  };

  const pending = appointments.filter(
    (a) => a.appointment_status === "pending",
  );
  const confirmed = appointments.filter(
    (a) => a.appointment_status === "confirmed",
  );
  const recent = [
    ...confirmed,
    ...appointments.filter((a) => a.appointment_status === "completed"),
  ].slice(0, 5);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
          <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Overview</span>
          </a>
          <a
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
            onClick={() => goTo("/doctor/appointments")}
          >
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
            onClick={() =>
              navigate
                ? navigate("/telemedicine")
                : (window.location.hash = "/telemedicine")
            }
            className="w-full text-left text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-200"
          >
            <span className="material-symbols-outlined" data-icon="video_chat">
              video_chat
            </span>
            <span className="font-semibold text-sm">Telemedicine</span>
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
          <a className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <span className="font-semibold text-sm">Help Center</span>
          </a>
          <button
            onClick={logout}
            className="text-slate-500 dark:text-slate-400 px-4 py-3 flex items-center gap-3 hover:bg-slate-200/50 transition-all w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      <main className="md:ml-64 p-8 min-h-screen">
        <header className="flex justify-between items-end mb-12">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary mb-2 block">
              {todayStr}
            </span>
            {loading ? (
              <div className="h-10 w-72 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Welcome, {doctor ? `Dr. ${doctor.full_name}` : "Doctor"}
              </h2>
            )}
            {doctor && (
              <p className="text-slate-400 font-medium mt-1">
                {doctor.specialization}
              </p>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="h-10 w-[1px] bg-slate-200"></div>
            <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              {pending.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
              )}
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-lg">
              {doctor ? doctor.full_name.charAt(0).toUpperCase() : "D"}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">
              progress_activity
            </span>
          </div>
        ) : pendingMode ? (
          <div className="max-w-lg mx-auto mt-8">
            <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background:
                    doctor?.verification_status === "rejected"
                      ? "rgb(254 226 226)"
                      : "rgb(254 249 195)",
                }}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{
                    color:
                      doctor?.verification_status === "rejected"
                        ? "#dc2626"
                        : "#ca8a04",
                  }}
                >
                  {doctor?.verification_status === "rejected"
                    ? "cancel"
                    : "schedule"}
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                {doctor?.verification_status === "rejected"
                  ? "Profile Not Approved"
                  : "Verification Pending"}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {doctor?.verification_status === "rejected"
                  ? "Your doctor profile application was not approved. Please contact platform support for further assistance."
                  : "Your profile has been submitted and is awaiting admin verification. You will have full access to the portal once approved."}
              </p>
              {doctor?.full_name && (
                <div className="bg-slate-50 rounded-xl px-5 py-4 text-left text-sm space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Name</span>
                    <span className="font-semibold text-slate-800">
                      Dr. {doctor.full_name}
                    </span>
                  </div>
                  {doctor.specialization && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">
                        Specialization
                      </span>
                      <span className="font-semibold text-slate-800">
                        {doctor.specialization}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Status</span>
                    <span
                      className={`font-bold capitalize ${doctor?.verification_status === "rejected" ? "text-red-600" : "text-yellow-600"}`}
                    >
                      {doctor?.verification_status}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={logout}
                className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">
                  logout
                </span>
                Sign Out
              </button>
            </div>
          </div>
        ) : createMode ? (
          <div className="max-w-lg mx-auto mt-8">
            <div className="bg-white rounded-2xl p-10 shadow-sm">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    medical_services
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  Set Up Your Profile
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Complete your doctor profile to access all portal features.
                </p>
              </div>
              {createError && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-medium">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateProfile} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.full_name}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="Dr. Jane Smith"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Specialization *
                  </label>
                  {specializationLocked ? (
                    <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-700 flex items-center justify-between">
                      <span>{createForm.specialization}</span>
                      <span className="text-xs text-slate-400 italic">
                        locked
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={createForm.specialization}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          specialization: e.target.value,
                        }))
                      }
                      placeholder="e.g. Cardiology"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    License Number *
                  </label>
                  <input
                    type="text"
                    value={createForm.license_number}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        license_number: e.target.value,
                      }))
                    }
                    placeholder="e.g. MD-123456"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Experience (yrs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.experience_years}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          experience_years: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Consult Fee ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.consultation_fee}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          consultation_fee: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={createForm.bio}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, bio: e.target.value }))
                    }
                    placeholder="A brief description of your background and approach..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createLoading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">
                        check_circle
                      </span>
                      Create Profile
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* Left column */}
            <section className="col-span-12 lg:col-span-8 space-y-8">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  {
                    label: "Total",
                    value: appointments.length,
                    icon: "event",
                    color: "text-primary",
                  },
                  {
                    label: "Pending",
                    value: pending.length,
                    icon: "pending_actions",
                    color: "text-yellow-600",
                  },
                  {
                    label: "Confirmed",
                    value: confirmed.length,
                    icon: "check_circle",
                    color: "text-green-600",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl p-6 shadow-sm text-center"
                  >
                    <span
                      className={`material-symbols-outlined text-3xl ${stat.color}`}
                    >
                      {stat.icon}
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 mt-2">
                      {stat.value}
                    </p>
                    <p className="text-xs font-bold uppercase text-slate-400 mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Today's / Recent Schedule */}
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">
                        calendar_today
                      </span>
                      Confirmed Sessions
                    </h3>
                    <button
                      onClick={() => goTo("/doctor/appointments")}
                      className="text-primary font-bold text-xs uppercase tracking-wider hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  {confirmed.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <span className="material-symbols-outlined text-4xl block mb-2">
                        event_available
                      </span>
                      <p className="text-sm">No confirmed sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {confirmed.slice(0, 4).map((a, i) => (
                        <div
                          key={a.appointment_id}
                          className="flex gap-4 group cursor-pointer"
                          onClick={() => goTo("/doctor/appointments")}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-400">
                              #{i + 1}
                            </span>
                            <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 flex-1 group-hover:bg-slate-100 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-slate-900 text-sm font-mono">
                                #{a.appointment_id.slice(0, 8).toUpperCase()}
                              </p>
                              <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                                Confirmed
                              </span>
                            </div>
                            {a.reason_for_visit && (
                              <p className="text-xs text-slate-500">
                                {a.reason_for_visit}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests */}
                <div className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">
                        pending_actions
                      </span>
                      Pending Requests
                    </h3>
                    {pending.length > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {pending.length} New
                      </span>
                    )}
                  </div>
                  {pending.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <span className="material-symbols-outlined text-4xl block mb-2">
                        inbox
                      </span>
                      <p className="text-sm">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pending.slice(0, 3).map((a) => (
                        <div
                          key={a.appointment_id}
                          className="border border-slate-100 rounded-2xl p-5 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              <span className="material-symbols-outlined text-sm">
                                person
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900 font-mono">
                                #{a.appointment_id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {new Date(a.created_at).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" },
                                )}
                              </p>
                            </div>
                          </div>
                          {a.reason_for_visit && (
                            <p className="text-xs text-slate-500 mb-3">
                              {a.reason_for_visit}
                            </p>
                          )}
                          <button
                            onClick={() => goTo("/doctor/appointments")}
                            className="w-full text-[11px] font-bold py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                          >
                            Review Request
                          </button>
                        </div>
                      ))}
                      {pending.length > 3 && (
                        <button
                          onClick={() => goTo("/doctor/appointments")}
                          className="w-full text-xs font-bold text-primary hover:underline py-2"
                        >
                          +{pending.length - 3} more pending requests
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Right column */}
            <section className="col-span-12 lg:col-span-4 space-y-8">
              {/* My Profile */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      badge
                    </span>
                    My Profile
                  </h3>
                  <button
                    onClick={openEditProfile}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      edit
                    </span>
                    Edit
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    [
                      "Name",
                      doctor?.full_name ? `Dr. ${doctor.full_name}` : "—",
                    ],
                    ["Specialization", doctor?.specialization || "—"],
                    ["License", doctor?.license_number || "—"],
                    [
                      "Experience",
                      doctor?.experience_years != null
                        ? `${doctor.experience_years} yrs`
                        : "—",
                    ],
                    [
                      "Consult Fee",
                      doctor?.consultation_fee != null
                        ? `$${doctor.consultation_fee}`
                        : "—",
                    ],
                  ].map(([label, val]) => (
                    <div
                      key={label}
                      className="flex justify-between items-start gap-3"
                    >
                      <span className="text-slate-400 font-medium shrink-0">
                        {label}
                      </span>
                      <span className="font-semibold text-slate-900 text-right">
                        {val}
                      </span>
                    </div>
                  ))}
                  {doctor?.bio && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {doctor.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    bolt
                  </span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => goTo("/doctor/appointments")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-left transition-colors group"
                  >
                    <span className="material-symbols-outlined text-primary">
                      event
                    </span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-primary">
                      Manage Appointments
                    </span>
                  </button>
                  <button
                    onClick={() => goTo("/doctor/availability")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-left transition-colors group"
                  >
                    <span className="material-symbols-outlined text-primary">
                      calendar_month
                    </span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-primary">
                      Update Availability
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    insights
                  </span>
                  Activity Summary
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      label: "Total Appointments",
                      value: appointments.length,
                      color: "bg-primary",
                    },
                    {
                      label: "Awaiting Review",
                      value: pending.length,
                      color: "bg-yellow-400",
                    },
                    {
                      label: "Confirmed",
                      value: confirmed.length,
                      color: "bg-green-400",
                    },
                    {
                      label: "Completed",
                      value: appointments.filter(
                        (a) => a.appointment_status === "completed",
                      ).length,
                      color: "bg-blue-400",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-8 ${item.color} rounded-full`}
                        ></div>
                        <span className="text-sm text-slate-600">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 120 }}
                  >
                    notifications_active
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                  System Status
                </h3>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg">
                      check_circle
                    </span>
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold">Platform Online:</span> All
                      services are running normally.
                    </p>
                  </div>
                  {doctor && (
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">
                        verified
                      </span>
                      <p className="text-xs leading-relaxed">
                        <span className="font-bold">Profile Status:</span>{" "}
                        {doctor.verification_status === "approved"
                          ? "Verified and active."
                          : `Status: ${doctor.verification_status}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {editProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              type="button"
              onClick={() => setEditProfile(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Edit Profile
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Update your professional details.
            </p>
            {editProfileError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                {editProfileError}
              </div>
            )}
            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Specialization
                </label>
                <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-400 flex items-center justify-between">
                  <span>{editForm.specialization || "—"}</span>
                  <span className="text-xs text-slate-400 italic">locked</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  License Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.license_number}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      license_number: e.target.value,
                    }))
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Experience (yrs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.experience_years}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        experience_years: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Consult Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.consultation_fee}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        consultation_fee: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  placeholder="A brief description of your background…"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editProfileLoading}
                  className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {editProfileLoading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">
                        save
                      </span>
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditProfile(false)}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
