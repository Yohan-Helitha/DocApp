import React, { useState, useEffect } from "react";
import Api from "../core/api";

export default function PatientPrescriptions({ navigate }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [accessDenied, setAccessDenied] = useState(false);
  const [filterAppointmentId, setFilterAppointmentId] = useState(null);

  const token = sessionStorage.getItem("accessToken");
  let userId = "";
  try {
    userId = JSON.parse(atob(token.split(".")[1])).sub;
  } catch {}

  // patientId from query string (falls back to current user's id)
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const patientId = params.get("patientId") || userId;
  const appointmentId = params.get("appointmentId") || null;

  useEffect(() => {
    if (!token || !userId) {
      navigate("/login");
      return;
    }
    let role = "";
    try {
      role = JSON.parse(atob(token.split(".")[1])).role;
    } catch {}
    if (role && role !== "patient" && role !== "admin") {
      setAccessDenied(true);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const apiUrl = `/api/v1/prescriptions/patients/${patientId}${appointmentId ? `?appointmentId=${appointmentId}` : ""}`;
        const r = await Api.get(apiUrl, token);
        if (r.status === 200) {
          setPrescriptions(r.body?.prescriptions || []);
        } else {
          setError("Could not load prescriptions.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId, token]);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

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
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate("/appointments")}
          className="text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {appointmentId
            ? "Prescriptions for this appointment"
            : "My Prescriptions"}
        </h1>
      </div>

      {appointmentId && (
        <div className="mb-6">
          <button
            onClick={() => navigate(`/prescriptions?patientId=${patientId}`)}
            className="text-sm text-primary font-semibold hover:underline"
          >
            ← View all prescriptions
          </button>
        </div>
      )}

      {!appointmentId && !loading && prescriptions.length > 1 && (
        <div className="mb-6">
          <select
            value={filterAppointmentId || ""}
            onChange={(e) => setFilterAppointmentId(e.target.value || null)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white"
          >
            <option value="">All appointments</option>
            {[
              ...new Set(
                prescriptions.map((p) => p.appointment_id).filter(Boolean),
              ),
            ].map((apptId) => (
              <option key={apptId} value={apptId}>
                #{apptId.slice(0, 8).toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="text-slate-500 text-sm text-center py-16">
          Loading prescriptions…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {!loading && !error && prescriptions.length === 0 && (
        <div className="text-slate-400 text-sm text-center py-16">
          No prescriptions found.
        </div>
      )}

      {!loading && prescriptions.length > 0 && (
        <div className="space-y-4">
          {prescriptions
            .filter(
              (p) =>
                !filterAppointmentId ||
                p.appointment_id === filterAppointmentId,
            )
            .map((p) => (
              <div
                key={p.prescription_id}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"
              >
                <button
                  onClick={() => toggle(p.prescription_id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {p.medication}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Issued{" "}
                      {new Date(p.issued_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-xl">
                    {expanded[p.prescription_id]
                      ? "expand_less"
                      : "expand_more"}
                  </span>
                </button>

                {expanded[p.prescription_id] && (
                  <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-2 gap-4 text-sm">
                    {p.dosage && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Dosage
                        </p>
                        <p className="text-slate-700">{p.dosage}</p>
                      </div>
                    )}
                    {p.frequency && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Frequency
                        </p>
                        <p className="text-slate-700">{p.frequency}</p>
                      </div>
                    )}
                    {p.duration && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Duration
                        </p>
                        <p className="text-slate-700">{p.duration}</p>
                      </div>
                    )}
                    {p.appointment_id && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Appointment ID
                        </p>
                        <p className="text-slate-500 text-xs font-mono">
                          {p.appointment_id}
                        </p>
                      </div>
                    )}
                    {p.instructions && (
                      <div className="col-span-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Instructions
                        </p>
                        <p className="text-slate-700">{p.instructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
