import reportService from "../services/reportService.js";

export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded or invalid file format" });
    }

    const reportData = {
      ...req.body,
      file_url: req.file.path, // Cloudinary provides the full URL here
      report_name: req.body.report_name || req.file.originalname,
      file_type: req.body.file_type || req.file.mimetype,
      file_size: req.file.size,
      uploaded_by:
        (req.patient && req.patient.id) ||
        (req.user && (req.user.id || req.user.sub)) ||
        req.body.uploaded_by,
      notes: req.body.notes || req.body.description,
    };

    const report = await reportService.uploadReport(
      req.params.patientId,
      reportData,
    );
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMedicalReports = async (req, res) => {
  try {
    const reports = await reportService.getMedicalReportsByPatientId(
      req.params.patientId,
    );
    res.status(200).json({
      reports: reports.map((report) => ({
        report_id: report.report_id,
        report_name: report.report_name,
        file_url: report.file_url,
        file_type: report.file_type,
        notes: report.notes,
        uploaded_at: report.uploaded_at,
        created_at: report.created_at,
        updated_at: report.updated_at,
        uploaded_by: report.uploaded_by,
        uploader_name: report.uploader
          ? `${report.uploader.first_name} ${report.uploader.last_name}`
          : "Unknown",
      })),
    });
  } catch (err) {
    if (err.message === "Patient not found") {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateReport = async (req, res) => {
  try {
    const { reportId, patientId } = req.params;
    let updateData = { ...req.body };

    // Handle file replacement if a new file is uploaded
    if (req.file) {
      updateData.file_url = req.file.path; // Cloudinary provides the full URL
      updateData.file_size = req.file.size;
      // Prioritize manually selected category from body over the new file's MIME type
      if (!updateData.file_type) {
        updateData.file_type = req.file.mimetype;
      }
      if (!updateData.report_name) {
        updateData.report_name = req.file.originalname;
      }
    }

    const report = await reportService.updateReport(
      reportId,
      patientId,
      updateData,
    );

    if (!report) {
      return res.status(404).json({ error: "report_not_found" });
    }

    res.status(200).json({
      report: {
        report_id: report.report_id,
        report_name: report.report_name,
        file_url: report.file_url,
        file_type: report.file_type,
        notes: report.notes,
        uploaded_at: report.uploaded_at,
        created_at: report.created_at,
        updated_at: report.updated_at,
        uploaded_by: report.uploaded_by,
        uploader_name: report.uploader
          ? `${report.uploader.first_name} ${report.uploader.last_name}`
          : "Unknown",
      },
    });
  } catch (err) {
    if (err.message.includes("Unauthorized")) {
      return res.status(403).json({ error: "unauthorized" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const { reportId, patientId } = req.params;

    const result = await reportService.deleteReport(reportId, patientId);

    if (!result) {
      return res.status(404).json({ error: "report_not_found" });
    }

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (err) {
    if (err.message.includes("Unauthorized")) {
      return res.status(403).json({ error: "unauthorized" });
    }
    res.status(500).json({ error: err.message });
  }
};
