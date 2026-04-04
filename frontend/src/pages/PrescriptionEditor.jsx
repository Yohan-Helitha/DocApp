import React, { useEffect, useState } from "react";
import Api from "../core/api";

export default function PrescriptionEditor({ navigate }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");

  // Past prescriptions list
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescsLoading, setPrescsLoading] = useState(false);
  const [expandedPresc, setExpandedPresc] = useState(null);

  const token = sessionStorage.getItem("accessToken");

  // Parse query params from hash
  const hash = window.location.hash.replace("#", "");
  const qs = hash.includes("?") ? hash.split("?")[1] : "";
  const params = Object.fromEntries(new URLSearchParams(qs));
  const appointmentId = params.appointmentId || "";
  const patientId = params.patientId || "";

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

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
          setError("No doctor profile found for this account.");
          setLoading(false);
          return;
        }

        setDoctor(me);

        // Fetch past prescriptions
        setPrescsLoading(true);
        try {
          const pRes = await Api.get(
            `/api/v1/doctors/${me.doctor_id}/prescriptions`,
            token,
          );
          if (pRes.status === 200) {
            setPrescriptions(pRes.body?.prescriptions || []);
          }
        } catch {
          /* ignore presc fetch errors */
        }
        setPrescsLoading(false);
      } catch {
        setError("Failed to load profile. Please try again.");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!medication.trim()) {
      setError("Medication is required.");
      return;
    }
    if (!patientId) {
      setError("Patient information is missing.");
      return;
    }
    if (!doctor) {
      setError("Doctor profile could not be loaded.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        patient_id: patientId,
        medication: medication.trim(),
      };
      if (dosage.trim()) body.dosage = dosage.trim();
      if (frequency.trim()) body.frequency = frequency.trim();
      if (duration.trim()) body.duration = duration.trim();
      if (diagnosis.trim()) body.diagnosis = diagnosis.trim();
      if (instructions.trim()) body.instructions = instructions.trim();
      if (appointmentId) body.appointment_id = appointmentId;

      const res = await Api.post(
        `/api/v1/doctors/${doctor.doctor_id}/prescriptions`,
        body,
        token,
      );

      if (res.status === 201 || res.status === 200) {
        setSuccess("Prescription submitted successfully. Redirecting…");
        setTimeout(() => goTo("/doctor/appointments"), 1800);
      } else {
        setError(res.body?.message || "Failed to submit prescription.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    }
    setSubmitting(false);
  };

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
          <a
            className="bg-[#0b9385]/10 text-[#0b9385] rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer"
            onClick={() => goTo("/doctor/appointments")}
          >
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
        {/* Back nav */}
        <button
          onClick={() => goTo("/doctor/appointments")}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-semibold mb-8"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Appointments
        </button>

        <header className="mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Write Prescription
          </h2>
          <p className="text-slate-400 font-medium mt-1">
            {loading ? "Loading…" : doctor ? `Dr. ${doctor.full_name}` : ""}
          </p>
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

        <div className="grid grid-cols-12 gap-8">
          {/* Form */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  medication
                </span>
                Prescription Details
              </h3>

              {loading ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined text-primary text-4xl animate-spin">
                    progress_activity
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Medication <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={medication}
                      onChange={(e) => setMedication(e.target.value)}
                      placeholder="e.g. Amoxicillin 500mg"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                        Dosage
                      </label>
                      <input
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="e.g. 500mg"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        placeholder="e.g. Twice daily"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 7 days"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Diagnosis
                    </label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Upper respiratory tract infection"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Instructions
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={4}
                      placeholder="Additional instructions for the patient…"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">
                          progress_activity
                        </span>
                        Submitting…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">
                          send
                        </span>
                        Submit Prescription
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Context panel */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  info
                </span>
                Appointment Info
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">
                    Appointment ID
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {appointmentId
                      ? `#${appointmentId.slice(0, 8).toUpperCase()}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Patient ID</span>
                  <span className="font-mono font-bold text-slate-900">
                    {patientId ? `${patientId.slice(0, 8)}…` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Doctor</span>
                  <span className="font-bold text-slate-900">
                    {doctor ? `Dr. ${doctor.full_name}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 100 }}
                >
                  medication
                </span>
              </div>
              <h4 className="font-bold text-sm mb-3 relative z-10 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  lightbulb
                </span>
                Reminder
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed relative z-10">
                Only <strong>Medication</strong> and <strong>Patient</strong>{" "}
                fields are required. All other fields are optional but help the
                patient follow the prescription accurately.
              </p>
            </div>
          </div>
        </div>

        {/* Past Prescriptions */}
        <div className="mt-10">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                history
              </span>
              Past Prescriptions
            </h3>
            {prescsLoading ? (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined text-primary text-3xl animate-spin">
                  progress_activity
                </span>
              </div>
            ) : prescriptions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No prescriptions issued yet.
              </p>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div
                    key={p.prescription_id}
                    className="border border-slate-100 rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPresc(
                          expandedPresc === p.prescription_id
                            ? null
                            : p.prescription_id,
                        )
                      }
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary">
                          medication
                        </span>
                        <div>
                          <p className="font-bold text-sm text-slate-900">
                            {p.medication}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmtDate(p.issued_at)}
                            {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-slate-400">
                          Patient: {p.patient_id.slice(0, 8)}…
                        </span>
                        <span className="material-symbols-outlined text-slate-400 text-lg">
                          {expandedPresc === p.prescription_id
                            ? "expand_less"
                            : "expand_more"}
                        </span>
                      </div>
                    </button>
                    {expandedPresc === p.prescription_id && (
                      <div className="px-5 pb-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {[
                          ["Dosage", p.dosage],
                          ["Frequency", p.frequency],
                          ["Duration", p.duration],
                          [
                            "Appointment ID",
                            p.appointment_id
                              ? `#${p.appointment_id.slice(0, 8).toUpperCase()}`
                              : null,
                          ],
                          ["Instructions", p.instructions],
                        ].map(
                          ([label, val]) =>
                            val && (
                              <div key={label}>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                  {label}
                                </span>
                                <p className="font-medium text-slate-900 mt-0.5">
                                  {val}
                                </p>
                              </div>
                            ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
