import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function PatientMedicalReports({ navigate }) {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [replacementFile, setReplacementFile] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [patientProfile, setPatientProfile] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    report_name: "",
    file: null,
    file_type: "other",
    notes: "",
  });

  const token = sessionStorage.getItem("accessToken");

  const decodeJwtPayload = (jwtToken) => {
    try {
      const payloadPart = String(jwtToken || '').split('.')[1];
      if (!payloadPart) return null;

      let b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      return JSON.parse(atob(b64));
    } catch {
      return null;
    }
  };

  // JWT `sub` is the source of truth; overwrite stale localStorage.
  let patientId = localStorage.getItem('patientId');
  const payload = token ? decodeJwtPayload(token) : null;
  const tokenPatientId = payload?.sub || payload?.userId;
  if (tokenPatientId && tokenPatientId !== patientId) {
    localStorage.setItem('patientId', tokenPatientId);
    patientId = tokenPatientId;
  } else if (!patientId && tokenPatientId) {
    localStorage.setItem('patientId', tokenPatientId);
    patientId = tokenPatientId;
  }

  useEffect(() => {
    if (patientId && token) {
      fetchReports();
      fetchPatientProfile();
    }
  }, [patientId, token]);

  useEffect(() => {
    applyFilters();
  }, [reports, searchQuery, selectedFileType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 404) {
        setReports([]);
        setError(null);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch reports");

      const data = await response.json();
      setReports(data.reports || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load medical reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientProfile = async () => {
    try {
      const response = await fetch(`/api/v1/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPatientProfile(data);
      }
    } catch (err) {
      console.error("Error fetching patient profile:", err);
    }
  };

  const downloadFullRecord = async (e, report) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setIsDownloading(true);
      const doc = new jsPDF();

      // Cover Page Design
      doc.setFillColor(11, 147, 133); // Primary color
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICIAL MEDICAL RECORD", 105, 20, { align: "center" });

      doc.setTextColor(33, 33, 33);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, {
        align: "center",
      });

      // Patient Details Section
      doc.setFontSize(14);
      doc.setTextColor(11, 147, 133);
      doc.text("PATIENT INFORMATION", 20, 55);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 58, 190, 58);

      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const details = [
        [
          "Name:",
          patientProfile?.full_name ||
            `${patientProfile?.first_name} ${patientProfile?.last_name}`,
        ],
        ["Patient ID:", patientProfile?.user_id || "N/A"],
        ["Date of Birth:", patientProfile?.dob || "N/A"],
        ["Gender:", patientProfile?.gender || "N/A"],
        ["Blood Group:", patientProfile?.blood_group || "N/A"],
        ["Email:", patientProfile?.email || "N/A"],
        ["Phone:", patientProfile?.phone || "N/A"],
        [
          "Emergency Contact:",
          `${patientProfile?.emergency_contact_name} (${patientProfile?.emergency_contact_phone})`,
        ],
        ["Address:", patientProfile?.address || "N/A"],
        ["Allergies:", patientProfile?.allergies || "None recorded"],
      ];

      let yPos = 68;
      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), 65, yPos);
        yPos += 8;
      });

      // Report Details Section
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(11, 147, 133);
      doc.text("REPORT DETAILS", 20, yPos);
      doc.line(20, yPos + 3, 190, yPos + 3);
      yPos += 12;

      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const reportDetails = [
        ["Report Name:", report.report_name],
        ["Category:", report.file_type.replace("_", " ").toUpperCase()],
        ["Upload Date:", new Date(report.uploaded_at).toLocaleDateString()],
        ["Notes:", report.notes || "No extra notes provided"],
      ];

      reportDetails.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");

        if (label === "Notes:") {
          const splitNotes = doc.splitTextToSize(String(value), 120);
          doc.text(splitNotes, 65, yPos);
        } else {
          doc.text(String(value), 65, yPos);
        }
        yPos += 8;
      });

      // Fetch the actual file
      const fileResponse = await fetch(report.file_url);
      const fileBlob = await fileResponse.blob();
      const fileType = fileBlob.type;

      if (fileType.includes("html")) {
        throw new Error(
          "Retrieved file is an HTML page (likely a routing error). Please redeploy services.",
        );
      }

      if (fileType === "application/pdf") {
        const existingPdfBytes = await fileBlob.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const coverPdfBytes = await doc.output("arraybuffer");
        const mainPdfDoc = await PDFDocument.load(coverPdfBytes);

        const copiedPages = await mainPdfDoc.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices(),
        );
        copiedPages.forEach((page) => mainPdfDoc.addPage(page));

        const mergedPdfBytes = await mainPdfDoc.save();
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Medical_Record_${report.report_name.replace(/\s+/g, "_")}.pdf`;
        link.click();
      } else if (fileType.startsWith("image/")) {
        const imgData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(fileBlob);
        });

        doc.addPage();
        doc.text("ATTACHED DOCUMENT", 105, 15, { align: "center" });
        doc.addImage(imgData, "JPEG", 15, 25, 180, 0); // scale width, auto height
        doc.save(
          `Medical_Record_${report.report_name.replace(/\s+/g, "_")}.pdf`,
        );
      } else {
        // Fallback for unsupported types (though should be filtered)
        doc.save(
          `Medical_Record_Summary_${report.report_name.replace(/\s+/g, "_")}.pdf`,
        );
        window.open(report.file_url, "_blank");
      }
    } catch (err) {
      console.error("Error generating report:", err);
      alert(
        "Failed to generate full record download. Downloading original file instead.",
      );
      window.open(report.file_url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (selectedFileType !== "all") {
      filtered = filtered.filter((r) => r.file_type === selectedFileType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.file_type.toLowerCase().includes(query) ||
          (r.notes && r.notes.toLowerCase().includes(query)),
      );
    }

    setFilteredReports(filtered);
  };

  const handleFileChange = (e) => {
    setUploadForm({ ...uploadForm, file: e.target.files[0] });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      alert("Please select a file");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("report_file", uploadForm.file);
      formData.append("file_type", uploadForm.file_type);
      formData.append("report_name", uploadForm.report_name);
      if (uploadForm.notes) {
        formData.append("notes", uploadForm.notes);
      }

      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Failed to upload report");

      setUploadForm({
        report_name: "",
        file: null,
        file_type: "other",
        notes: "",
      });
      setShowUploadModal(false);
      fetchReports();
    } catch (err) {
      console.error("Error uploading report:", err);
      alert("Failed to upload report");
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports/${reportId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) throw new Error("Failed to delete report");
      fetchReports();
    } catch (err) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report");
    }
  };

  const handleUpdateReport = async (reportId) => {
    try {
      const formData = new FormData();
      formData.append("report_name", editingName);
      formData.append("file_type", editingType);
      formData.append("notes", editingNotes);

      if (replacementFile) {
        formData.append("report_file", replacementFile);
      }

      const response = await fetch(
        `/api/v1/patients/${patientId}/medical-reports/${reportId}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Failed to update report");

      setEditingReportId(null);
      setEditingName("");
      setEditingType("");
      setEditingNotes("");
      setReplacementFile(null);
      fetchReports();
    } catch (err) {
      console.error("Error updating report:", err);
      alert("Failed to update report");
    }
  };

  const getFileTypeIcon = (fileType) => {
    const iconMap = {
      lab_result: "science",
      scan: "image",
      blood_work: "bloodtype",
      xray: "radiology",
      ultrasound: "settings_remote",
      other: "description",
    };
    return iconMap[fileType] || "description";
  };

  const getFileTypeColor = (fileType) => {
    const colorMap = {
      lab_result: "bg-blue-100 text-blue-700",
      scan: "bg-purple-100 text-purple-700",
      blood_work: "bg-red-100 text-red-700",
      xray: "bg-yellow-100 text-yellow-700",
      ultrasound: "bg-green-100 text-green-700",
      other: "bg-slate-200 text-slate-700",
    };
    return colorMap[fileType] || colorMap["other"];
  };

  return (
    <DashboardLayout navigate={navigate} pageName="Medical Reports">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Medical Reports
            </h1>
            <p className="text-slate-600">
              Upload and manage your medical documents and reports.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">upload</span>
            Upload Report
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-primary hover:bg-primary/90 transition-colors rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">description</span>{" "}
                Total Reports
              </h3>
              <p className="text-4xl font-black mb-1">{reports.length}</p>
              <p className="text-sm opacity-80">Medical documents uploaded</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">filter_list</span>{" "}
                File Type
              </h3>
              <div className="space-y-2">
                {[
                  "all",
                  "lab_result",
                  "scan",
                  "blood_work",
                  "xray",
                  "ultrasound",
                  "other",
                ].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedFileType(type)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      selectedFileType === type
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {type === "all" ? "All Types" : type.replace("_", " ")} (
                    {
                      reports.filter(
                        (r) => type === "all" || r.file_type === type,
                      ).length
                    }
                    )
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Report Types</h3>
              <p className="text-xs text-slate-500 mb-4 font-black uppercase tracking-wider">
                Supported Formats
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Lab Results</p>
                <p>• Medical Scans</p>
                <p>• X-Rays</p>
                <p>• Blood Work</p>
                <p>• Ultrasound</p>
                <p>• Other Documents</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    search
                  </span>
                  <h3 className="font-bold text-slate-900">Search</h3>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search by report type or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                Search in report types and notes
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-center">
                <span className="text-slate-500">Loading reports...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700">
                {error}
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="flex justify-center mb-4">
                  <span className="material-symbols-outlined text-5xl text-slate-300">
                    description
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">
                  No reports yet
                </h3>
                <p className="text-slate-500 mb-6">
                  Start by uploading your first medical report
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">upload</span>
                  Upload Now
                </button>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="flex justify-center mb-4">
                  <span className="material-symbols-outlined text-5xl text-slate-300">
                    search_off
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">
                  No matching reports
                </h3>
                <p className="text-slate-500 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedFileType("all");
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.report_id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div
                              className={`size-12 rounded-xl flex items-center justify-center ${getFileTypeColor(report.file_type)}`}
                            >
                              <span className="material-symbols-outlined text-2xl">
                                {getFileTypeIcon(report.file_type)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 text-lg capitalize mb-1">
                                {report.report_name ||
                                  report.file_type.replace("_", " ")}
                              </h4>
                              <p className="text-sm text-slate-400 font-medium mb-1 capitalize">
                                Type: {report.file_type.replace("_", " ")}
                              </p>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                  Uploaded By: {report.uploader_name || "Me"}
                                </span>
                                <p className="text-sm text-slate-500 font-medium">
                                  on{" "}
                                  {new Date(
                                    report.uploaded_at,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>

                              {expandedReportId === report.report_id && (
                                <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
                                  <p>
                                    <span className="font-bold">
                                      Created At:
                                    </span>{" "}
                                    {new Date(
                                      report.created_at || report.uploaded_at,
                                    ).toLocaleString()}
                                  </p>
                                  <p>
                                    <span className="font-bold">
                                      Last Updated:
                                    </span>{" "}
                                    {new Date(
                                      report.updated_at ||
                                        report.created_at ||
                                        report.uploaded_at,
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              )}

                              {editingReportId === report.report_id ? (
                                <div className="mt-4 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider text-slate-900">
                                      Report Name *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={editingName}
                                      onChange={(e) =>
                                        setEditingName(e.target.value)
                                      }
                                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider text-slate-900">
                                      Category *
                                    </label>
                                    <select
                                      required
                                      value={editingType}
                                      onChange={(e) =>
                                        setEditingType(e.target.value)
                                      }
                                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                    >
                                      <option value="lab_result">
                                        Lab Result
                                      </option>
                                      <option value="scan">Medical Scan</option>
                                      <option value="blood_work">
                                        Blood Work
                                      </option>
                                      <option value="xray">X-Ray</option>
                                      <option value="ultrasound">
                                        Ultrasound
                                      </option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                      Replace File (Optional)
                                    </label>
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        setReplacementFile(e.target.files[0])
                                      }
                                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                      Notes (Optional)
                                    </label>
                                    <textarea
                                      value={editingNotes}
                                      onChange={(e) =>
                                        setEditingNotes(e.target.value)
                                      }
                                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm"
                                      placeholder="Add any relevant notes about this report..."
                                      rows="3"
                                    />
                                  </div>

                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() =>
                                        handleUpdateReport(report.report_id)
                                      }
                                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90"
                                    >
                                      Save Changes
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingReportId(null);
                                        setReplacementFile(null);
                                      }}
                                      className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-100"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {report.notes && (
                                    <p className="text-sm text-slate-600 italic mb-2">
                                      {report.notes}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-3">
                                    <a
                                      href={report.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="material-symbols-outlined text-base">
                                        attach_file
                                      </span>
                                      View Original Document
                                    </a>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedReportId(
                                expandedReportId === report.report_id
                                  ? null
                                  : report.report_id,
                              );
                            }}
                            className={`p-2 rounded-lg transition-all flex items-center justify-center gap-1 ${expandedReportId === report.report_id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"}`}
                            title={
                              expandedReportId === report.report_id
                                ? "Hide Details"
                                : "View Quick Details"
                            }
                          >
                            <span className="material-symbols-outlined text-xl">
                              {expandedReportId === report.report_id
                                ? "visibility_off"
                                : "visibility"}
                            </span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingReportId(report.report_id);
                              setEditingName(report.report_name || "");
                              setEditingType(report.file_type || "other");
                              setEditingNotes(report.notes || "");
                            }}
                            className="p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all flex items-center justify-center"
                            title="Edit Report Details"
                          >
                            <span className="material-symbols-outlined text-xl">
                              edit_note
                            </span>
                          </button>

                          <div className="w-px h-6 bg-slate-200 mx-1"></div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report.report_id);
                            }}
                            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all flex items-center justify-center"
                            title="Delete Report"
                          >
                            <span className="material-symbols-outlined text-xl">
                              delete_forever
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Upload Medical Report
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Report Name *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.report_name}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      report_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900"
                  placeholder="e.g. Annual Blood Test 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  File Type *
                </label>
                <select
                  required
                  value={uploadForm.file_type}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, file_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="lab_result">Lab Result</option>
                  <option value="scan">Medical Scan</option>
                  <option value="blood_work">Blood Work</option>
                  <option value="xray">X-Ray</option>
                  <option value="ultrasound">Ultrasound</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Select File *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Supported: PDF, JPG, PNG, DOC, DOCX
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                  rows="3"
                  placeholder="Add any relevant notes about this report..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
