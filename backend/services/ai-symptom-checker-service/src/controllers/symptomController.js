import env from "../config/environment.js";
import { analyzeSymptoms, GeminiError } from "../services/geminiService.js";
import { fetchDoctorsBySpecialty } from "../services/doctorService.js";

const handleError = (err, res, req, context) => {
  req.log?.error?.(err, context);
  if (err?.status) return res.status(err.status).json({ error: err.message });
  return res.status(500).json({ error: "internal_error" });
};

export const analyze = async (req, res) => {
  try {
    const {
      message,
      conversation_history: conversationHistory,
      report_base64: reportBase64,
      report_mime_type: reportMimeType,
    } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message_required" });
    }

    const ai = await analyzeSymptoms({
      message,
      conversationHistory: Array.isArray(conversationHistory)
        ? conversationHistory
        : [],
      reportBase64: reportBase64 || null,
      reportMimeType: reportMimeType || null,
    });

    if (!ai || typeof ai !== "object" || !ai.message) {
      return res
        .status(500)
        .json({ error: "ai_invalid_response", message: String(ai) });
    }

    if (!ai.assessment_complete) {
      return res.json({
        message: ai.message,
        assessment_complete: false,
      });
    }

    // Persist completed checks
    const fullConversation = [
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: ai.message }] },
    ];

    const { rows } = await req.db.query(
      `INSERT INTO symptom_checks
        (patient_id, input_symptoms_json, predicted_specialty, risk_level, suggestion_text, model_version)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING check_id`,
      [
        req.user.id,
        JSON.stringify(fullConversation),
        ai.predicted_specialty || null,
        ai.risk_level || null,
        ai.message,
        env.GEMINI_MODEL,
      ],
    );

    const checkId = rows?.[0]?.check_id;

    // Fetch available doctors (graceful if doctor service is down)
    let doctors = [];
    let fallback_message = null;
    try {
      doctors = await fetchDoctorsBySpecialty({
        specialty: ai.predicted_specialty,
        authorization: req.headers.authorization,
      });
      if (!doctors.length && ai.predicted_specialty) {
        fallback_message = `No ${ai.predicted_specialty} doctors are currently available on the platform. We recommend consulting a ${ai.predicted_specialty} at your nearest hospital.`;
      }
    } catch (e) {
      req.log?.warn?.({ err: e }, "doctor service unreachable");
      fallback_message = "doctor_service_unavailable";
    }

    return res.json({
      message: ai.message,
      assessment_complete: true,
      predicted_specialty: ai.predicted_specialty,
      risk_level: ai.risk_level,
      action_recommendation: ai.action_recommendation,
      check_id: checkId,
      specialty: ai.predicted_specialty,
      doctors,
      fallback_message,
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      // GeminiError is user-facing; still log the underlying cause for diagnostics.
      const causeMessage =
        err?.cause?.message || err?.cause?.toString?.() || undefined;
      req.log?.error?.(
        {
          status: err.status,
          code: err.code,
          cause: causeMessage,
        },
        "GeminiError",
      );
      return res.status(err.status).json({ error: err.message });
    }
    return handleError(err, res, req, "analyze");
  }
};

export const specialtyRecommendations = async (req, res) => {
  try {
    const specialty = req.query?.specialty;
    if (!specialty) {
      return res.status(400).json({ error: "specialty_required" });
    }

    let doctors = [];
    let fallback_message = null;
    try {
      doctors = await fetchDoctorsBySpecialty({
        specialty,
        authorization: req.headers.authorization,
      });
      if (!doctors.length) {
        fallback_message = `No ${specialty} doctors are currently available on the platform. We recommend consulting a ${specialty} at your nearest hospital.`;
      }
    } catch (e) {
      req.log?.warn?.({ err: e }, "doctor service unreachable");
      fallback_message = "doctor_service_unavailable";
    }

    return res.json({ specialty, doctors, fallback_message });
  } catch (err) {
    return handleError(err, res, req, "specialtyRecommendations");
  }
};

export const history = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    if (req.user.id !== patientId) {
      return res.status(403).json({ error: "forbidden" });
    }

    const { rows } = await req.db.query(
      `SELECT check_id, predicted_specialty, risk_level, suggestion_text, created_at
       FROM symptom_checks
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId],
    );

    return res.json(rows || []);
  } catch (err) {
    return handleError(err, res, req, "history");
  }
};

export const feedback = async (req, res) => {
  try {
    const { check_id, patient_feedback, rating } = req.body || {};
    if (!check_id) return res.status(400).json({ error: "check_id_required" });

    if (rating !== undefined && rating !== null) {
      const r = Number(rating);
      if (Number.isNaN(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: "invalid_rating" });
      }
    }

    // Ensure the check belongs to this patient
    const r1 = await req.db.query(
      `SELECT check_id FROM symptom_checks WHERE check_id = $1 AND patient_id = $2`,
      [check_id, req.user.id],
    );
    if (!r1.rows?.[0]) return res.status(404).json({ error: "check_not_found" });

    const { rows } = await req.db.query(
      `INSERT INTO symptom_check_feedback (check_id, patient_feedback, rating)
       VALUES ($1, $2, $3)
       RETURNING feedback_id, created_at`,
      [check_id, patient_feedback || null, rating ?? null],
    );

    return res.status(201).json({ feedback: rows?.[0] });
  } catch (err) {
    return handleError(err, res, req, "feedback");
  }
};
