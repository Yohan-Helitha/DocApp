import React, { useState, useEffect } from "react";
import Api from "../core/api";
import DashboardLayout from "../layouts/DashboardLayout";
import { jsPDF } from "jspdf";

export default function PatientPrescriptions({ navigate }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [accessDenied, setAccessDenied] = useState(false);
  const [filterAppointmentId, setFilterAppointmentId] = useState(null);
  const [patientFullName, setPatientFullName] = useState("");

  const token = sessionStorage.getItem("accessToken");
  let userId = "";
  let userEmail = "";
  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    userId = decoded.sub;
    userEmail = decoded.email || "";
  } catch {}

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
        const apiUrl =
          "/api/v1/prescriptions/patients/" +
          patientId +
          (appointmentId ? "?appointmentId=" + appointmentId : "");
        const r = await Api.get(apiUrl, token);
        if (r.status === 200) {
          setPrescriptions(r.body?.prescriptions || []);
        } else {
          setError("Could not load prescriptions.");
        }
        // Fetch patient profile for full name (used in PDF header)
        const pRes = await Api.get(`/api/v1/patients/${patientId}`, token);
        if (pRes.status === 200 && pRes.body) {
          const p = pRes.body;
          setPatientFullName(
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              p.full_name ||
              "",
          );
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

  const generatePDF = (list, title) => {
    if (!list.length) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let pageNum = 1;

    const drawPageHeader = () => {
      doc.setFillColor(11, 147, 133);
      doc.rect(0, 0, pageW, 26, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("PRESCRIPTIONS", margin, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("DocApp Medical System", margin, 21);
      if (patientFullName || userEmail) {
        doc.text(
          "Patient: " + (patientFullName || userEmail),
          pageW - margin,
          13,
          { align: "right" },
        );
      }
      doc.text(
        "Generated: " +
          new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        pageW - margin,
        21,
        { align: "right" },
      );
      return 32;
    };

    const drawPageFooter = () => {
      const fy = pageH - 8;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Computer-generated document from DocApp. Not a substitute for professional medical advice.",
        margin,
        fy,
      );
      doc.text("Page " + pageNum, pageW - margin, fy, { align: "right" });
    };

    let y = drawPageHeader();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      list.length + " prescription" + (list.length !== 1 ? "s" : ""),
      margin,
      y + 5,
    );
    y += 13;

    doc.setDrawColor(11, 147, 133);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineWidth(0.2);
    y += 5;

    list.forEach((p) => {
      const instrLines = p.instructions
        ? doc.splitTextToSize("Instructions: " + p.instructions, contentW)
            .length
        : 0;
      const diagLines = p.diagnosis
        ? doc.splitTextToSize("Diagnosis: " + p.diagnosis, contentW).length
        : 0;
      const hasDetails = p.dosage || p.frequency || p.duration;
      const estH =
        6 +
        (p.doctor_name ? 5 : 0) +
        (hasDetails ? 5 : 0) +
        diagLines * 4.5 +
        instrLines * 4.5 +
        8;

      if (y + estH > pageH - 14) {
        drawPageFooter();
        doc.addPage();
        pageNum++;
        y = drawPageHeader();
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(title + " (continued)", margin, y);
        y += 6;
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, y, pageW - margin, y);
        y += 5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(p.medication || "Unknown medication", margin, y);
      const dateStr = p.issued_at
        ? new Date(p.issued_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      if (dateStr) doc.text(dateStr, pageW - margin, y, { align: "right" });
      y += 5;

      if (p.doctor_name) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(11, 147, 133);
        doc.text(
          "Dr. " +
            p.doctor_name +
            (p.doctor_specialization ? " - " + p.doctor_specialization : ""),
          margin,
          y,
        );
        y += 5;
      }

      if (hasDetails) {
        const parts = [
          p.dosage ? "Dosage: " + p.dosage : null,
          p.frequency ? "Freq: " + p.frequency : null,
          p.duration ? "Duration: " + p.duration : null,
        ]
          .filter(Boolean)
          .join("   |   ");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(parts, margin, y);
        y += 5;
      }

      if (p.diagnosis) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const wrapped = doc.splitTextToSize(
          "Diagnosis: " + p.diagnosis,
          contentW,
        );
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.5;
      }

      if (p.instructions) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const wrapped = doc.splitTextToSize(
          "Instructions: " + p.instructions,
          contentW,
        );
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.5;
      }

      y += 3;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
    });

    drawPageFooter();
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    doc.save(safeTitle + "_" + new Date().toISOString().slice(0, 10) + ".pdf");
  };

  const activeApptFilter = appointmentId || filterAppointmentId;

  const visiblePrescriptions = prescriptions.filter(
    (p) => !filterAppointmentId || p.appointment_id === filterAppointmentId,
  );

  const apptFilteredCount = activeApptFilter
    ? prescriptions.filter((p) => p.appointment_id === activeApptFilter).length
    : 0;

  const handleDownloadAll = () =>
    generatePDF(prescriptions, "My Prescriptions");

  const handleDownloadForAppointment = () => {
    const filtered = prescriptions.filter(
      (p) => p.appointment_id === activeApptFilter,
    );
    generatePDF(
      filtered,
      "Prescriptions - Appointment #" +
        activeApptFilter.slice(0, 8).toUpperCase(),
    );
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
    <DashboardLayout navigate={navigate} pageName="Prescriptions">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {appointmentId
                ? "Prescriptions for this Appointment"
                : "My Prescriptions"}
            </h1>
            <p className="text-slate-600">
              {appointmentId
                ? "Prescriptions issued for this specific appointment."
                : "View all prescriptions issued to you by your doctors."}
            </p>
          </div>
          {appointmentId && (
            <button
              onClick={() => navigate("/prescriptions?patientId=" + patientId)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              View All Prescriptions
            </button>
          )}
        </div>

        {!loading && prescriptions.length > 0 && (
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            {!appointmentId ? (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Filter by Appointment
                </label>
                <select
                  value={filterAppointmentId || ""}
                  onChange={(e) =>
                    setFilterAppointmentId(e.target.value || null)
                  }
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white"
                >
                  <option value="">All appointments</option>
                  {[
                    ...new Set(
                      prescriptions
                        .map((p) => p.appointment_id)
                        .filter(Boolean),
                    ),
                  ].map((apptId) => (
                    <option key={apptId} value={apptId}>
                      {"#" + apptId.slice(0, 8).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20"
              >
                <span className="material-symbols-outlined text-sm">
                  download
                </span>
                {"Download All (" + prescriptions.length + ")"}
              </button>
              {activeApptFilter && apptFilteredCount > 0 && (
                <button
                  onClick={handleDownloadForAppointment}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">
                    filter_alt
                  </span>
                  {"Download for this Appointment (" + apptFilteredCount + ")"}
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-24">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">
              progress_activity
            </span>
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

        {!loading && visiblePrescriptions.length > 0 && (
          <div className="space-y-3">
            {visiblePrescriptions.map((p) => (
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
                      {p.issued_at &&
                        new Date(p.issued_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      {p.diagnosis && " - " + p.diagnosis}
                      {p.doctor_name && " - Dr. " + p.doctor_name}
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
                    {p.doctor_name && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          Doctor
                        </p>
                        <p className="text-slate-700">
                          {"Dr. " + p.doctor_name}
                        </p>
                        {p.doctor_specialization && (
                          <p className="text-xs text-slate-400">
                            {p.doctor_specialization}
                          </p>
                        )}
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
    </DashboardLayout>
  );
}
