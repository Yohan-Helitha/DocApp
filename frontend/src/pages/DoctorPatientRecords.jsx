import React, { useEffect, useState, useMemo } from "react";
import Api from "../core/api";

const FILE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "lab_result", label: "Lab Result" },
  { value: "scan", label: "Medical Scan" },
  { value: "blood_work", label: "Blood Work" },
  { value: "xray", label: "X-Ray" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "other", label: "Other" },
];

const TYPE_ICON = {
  lab_result: "science",
  scan: "image",
  blood_work: "water_drop",
  xray: "radiology",
  ultrasound: "monitor_heart",
  other: "description",
};

const TYPE_COLOR = {
  lab_result: "bg-blue-100 text-blue-700",
  scan: "bg-purple-100 text-purple-700",
  blood_work: "bg-red-100 text-red-700",
  xray: "bg-amber-100 text-amber-700",
  ultrasound: "bg-teal-100 text-teal-700",
  other: "bg-slate-200 text-slate-700",
};

export default function DoctorPatientRecords({ navigate }) {
  const token = sessionStorage.getItem("accessToken");

  // Parse query params from hash (e.g. #/doctor/patient-records?patientId=xxx&patientName=John)
  const hashQuery = window.location.hash.includes("?")
    ? window.location.hash.split("?")[1]
    : "";
  const qp = new URLSearchParams(hashQuery);
  const initialPatientId = qp.get("patientId") || "";
  const initialPatientName = qp.get("patientName") || "";

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);

  // All appointments to derive unique patient list
  const [appointments, setAppointments] = useState([]);

  // Selected patient filter
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedPatientName, setSelectedPatientName] =
    useState(initialPatientName);

  // Reports for the selected patient
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");

  // Category filter
  const [selectedType, setSelectedType] = useState("all");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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

  // Load doctor + appointments on mount
  useEffect(() => {
    const load = async () => {
      if (!token) {
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

      let userId = "";
      try {
        userId = JSON.parse(atob(token.split(".")[1])).sub;
      } catch {}

      const dRes = await Api.get("/api/v1/doctors", token);
      if (dRes.status !== 200) {
        setLoading(false);
        return;
      }

      const me = (dRes.body?.doctors || []).find((d) => d.user_id === userId);
      if (!me) {
        const ownRes = await Api.get("/api/v1/doctors/me", token);
        if (ownRes.status === 200 && ownRes.body?.doctor) {
          setProfileStatus(ownRes.body.doctor.verification_status);
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
      }
      setLoading(false);
    };
    load();
  }, []);

  // Derive unique patients from appointments (confirmed + paid only, as those are the clinically relevant ones)
  const patients = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const appt of appointments) {
      if (seen.has(appt.patient_id)) continue;
      seen.add(appt.patient_id);
      const name = appt.patient_name || "Patient";
      list.push({ patient_id: appt.patient_id, display_name: name });
    }
    return list;
  }, [appointments]);

  // Fetch reports whenever selected patient changes
  useEffect(() => {
    if (!selectedPatientId || !doctor) return;
    const fetchReports = async () => {
      setReportsLoading(true);
      setReportsError("");
      setReports([]);
      try {
        const res = await fetch(
          `/api/v1/doctors/${doctor.doctor_id}/patients/${selectedPatientId}/reports`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setReports(data.reports || []);
      } catch {
        setReportsError("Failed to load reports. Please try again.");
      } finally {
        setReportsLoading(false);
      }
    };
    fetchReports();
  }, [selectedPatientId, doctor]);

  // Apply category + search filters
  const filtered = useMemo(() => {
    let result = [...reports];
    if (selectedType !== "all") {
      result = result.filter((r) => r.file_type === selectedType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.report_name && r.report_name.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          (r.file_type && r.file_type.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [reports, selectedType, searchQuery]);

  const handleSelectPatient = (patient) => {
    setSelectedPatientId(patient.patient_id);
    setSelectedPatientName(patient.display_name);
    setSelectedType("all");
    setSearchQuery("");
  };

  // ── Guard states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 font-semibold">Access denied.</p>
      </div>
    );
  }

  if (profileStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-amber-400 block mb-3">
            pending
          </span>
          <p className="text-slate-700 font-semibold">
            Your profile is{" "}
            {profileStatus === "none" ? "not set up" : profileStatus}.
          </p>
          <button
            onClick={() => goTo("/doctor/appointments")}
            className="mt-4 text-primary underline text-sm"
          >
            Go to Appointments
          </button>
        </div>
      </div>
    );
  }

  const pending = appointments.filter(
    (a) => a.appointment_status === "pending",
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background antialiased min-h-screen">
      <div className="flex">
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
            <a className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer">
              <span className="material-symbols-outlined">folder_shared</span>
              <span className="font-semibold text-sm">Patient Records</span>
            </a>
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
        <main className="md:ml-64 flex-1 p-8 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-black text-slate-900 mb-1">
              Patient Medical Records
            </h1>
            <p className="text-slate-500 text-sm mb-8">
              View all medical records uploaded by your patients.
            </p>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: Patient list */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Patients
                    </p>
                  </div>
                  {patients.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-4 py-4">
                      No patients yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {patients.map((p) => (
                        <li key={p.patient_id}>
                          <button
                            onClick={() => handleSelectPatient(p)}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                              selectedPatientId === p.patient_id
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-slate-700 hover:bg-slate-50 font-medium"
                            }`}
                          >
                            <span className="material-symbols-outlined text-base flex-shrink-0">
                              person
                            </span>
                            <span className="truncate">{p.display_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right: Reports panel */}
              <div className="flex-1 min-w-0">
                {!selectedPatientId ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">
                      folder_shared
                    </span>
                    <p className="text-slate-400 font-medium">
                      Select a patient from the list to view their records.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {selectedPatientName || "Patient"}'s Records
                        </h2>
                        <p className="text-xs text-slate-400">
                          {reports.length} total report
                          {reports.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {/* Search */}
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          search
                        </span>
                        <input
                          type="text"
                          placeholder="Search reports..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
                        />
                      </div>
                    </div>

                    {/* Category filter tabs */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {FILE_TYPES.map((ft) => {
                        const count =
                          ft.value === "all"
                            ? reports.length
                            : reports.filter((r) => r.file_type === ft.value)
                                .length;
                        return (
                          <button
                            key={ft.value}
                            onClick={() => setSelectedType(ft.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                              selectedType === ft.value
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
                            }`}
                          >
                            {ft.label} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Report cards */}
                    {reportsLoading ? (
                      <div className="flex justify-center py-16">
                        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
                          progress_activity
                        </span>
                      </div>
                    ) : reportsError ? (
                      <div className="bg-red-50 text-red-600 rounded-2xl px-5 py-4 text-sm border border-red-100">
                        {reportsError}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">
                          search_off
                        </span>
                        <p className="text-slate-400 text-sm">
                          {reports.length === 0
                            ? "This patient has not uploaded any medical records yet."
                            : "No records match the current filter."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filtered.map((report) => {
                          const typeColor =
                            TYPE_COLOR[report.file_type] || TYPE_COLOR.other;
                          const typeIcon =
                            TYPE_ICON[report.file_type] || "description";
                          const typeLabel =
                            FILE_TYPES.find(
                              (ft) => ft.value === report.file_type,
                            )?.label ||
                            report.file_type?.replace(/_/g, " ") ||
                            "Other";
                          return (
                            <div
                              key={report.report_id}
                              className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-start gap-4"
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor}`}
                              >
                                <span className="material-symbols-outlined text-xl">
                                  {typeIcon}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">
                                      {report.report_name || typeLabel}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span
                                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeColor}`}
                                      >
                                        {typeLabel}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {new Date(
                                          report.uploaded_at,
                                        ).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <a
                                    href={report.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      open_in_new
                                    </span>
                                    View File
                                  </a>
                                </div>
                                {report.notes && (
                                  <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    {report.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
