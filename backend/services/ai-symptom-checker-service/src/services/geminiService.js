import { GoogleGenerativeAI } from "@google/generative-ai";
import env from "../config/environment.js";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";

const stripCodeFences = (text) =>
  String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

const tryParseJsonFromText = (rawText) => {
  const clean = stripCodeFences(rawText);
  try {
    return JSON.parse(clean);
  } catch {
    // If the model wrapped JSON with extra prose, try extracting the JSON object.
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = clean.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const DISCLAIMER_TEXT =
  "This is a preliminary AI assessment and is NOT a medical diagnosis. Please consult a qualified doctor for proper evaluation.";

// We do not allow medication/prescription advice (including OTC) in responses.
const MEDICATION_OR_DOSING_PATTERN =
  /\b(otc|over-the-counter|prescription|prescribe|medication|medicine|drug|analgesic|antihistamine|decongestant|antibiotic|antibiotics|antiviral|steroid|nsaid|pain\s*relief|pain\s*reliever|painkiller|dose|dosage|mg|ml|tablet|tablets|capsule|capsules|ibuprofen|paracetamol|acetaminophen|naproxen|aspirin|diclofenac|amoxicillin|azithromycin|metformin|insulin)\b/i;

const sanitizeAiMessage = (text) => {
  const msg = String(text || "").trim();
  if (!msg) return DISCLAIMER_TEXT;

  // Enforce: no medication suggestions.
  if (MEDICATION_OR_DOSING_PATTERN.test(msg)) {
    return (
      "I can’t provide medication or prescription advice.\n" +
      "- Rest and avoid strenuous activity.\n" +
      "- Stay hydrated and monitor your symptoms.\n" +
      "- If symptoms are severe, worsening, or you’re worried, seek urgent medical care.\n\n" +
      DISCLAIMER_TEXT
    );
  }

  // Enforce brevity while keeping a disclaimer.
  const maxLen = 1200;
  let out = msg.length > maxLen ? msg.slice(0, maxLen).trimEnd() + "…" : msg;

  if (!/not a medical diagnosis/i.test(out)) {
    out = `${out}\n\n${DISCLAIMER_TEXT}`;
  }

  return out;
};

export class GeminiError extends Error {
  constructor(message, { status = 500, code = "ai_error", cause } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

export async function analyzeSymptoms({
  message,
  conversationHistory = [],
  reportBase64 = null,
  reportMimeType = null,
}) {
  if (!env.GEMINI_API_KEY) {
    throw new GeminiError("AI service unavailable", {
      status: 500,
      code: "missing_gemini_api_key",
    });
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  const preferredModel = env.GEMINI_MODEL;
  // Fallback models (avoid deprecated/removed 1.5.*).
  // Keep this list minimal and modern; 2.0-flash is the closest fallback when 2.5-flash is unavailable.
  const fallbackModels = ["gemini-2.0-flash", "gemini-2.0-flash-001"].filter(
    (m) => m !== preferredModel,
  );

  const history = [
    // Persist safety rules across all turns.
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    ...(conversationHistory.length ? conversationHistory : []),
  ];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const runOnce = async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const chat = model.startChat({ history });

    const parts = [{ text: message }];
    if (reportBase64) {
      parts.push({
        inlineData: { data: reportBase64, mimeType: reportMimeType },
      });
    }

    const result = await chat.sendMessage(parts);
    const rawText = result.response.text();

    const parsed = tryParseJsonFromText(rawText);
    const out =
      parsed && typeof parsed === "object"
        ? parsed
        : { message: rawText, assessment_complete: false };

    if (out && typeof out === "object" && "message" in out) {
      out.message = sanitizeAiMessage(out.message);
    }

    return out;
  };

  const runWithRetry = async (modelName, { attempts = 2 } = {}) => {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await runOnce(modelName);
      } catch (e) {
        lastErr = e;
        const status = e?.status || e?.response?.status;
        // Retry only for transient service-side issues.
        if (![500, 502, 503, 504].includes(status)) {
          throw e;
        }
        // Small backoff to smooth over brief demand spikes.
        await sleep(200);
      }
    }
    throw lastErr;
  };

  try {
    return await runWithRetry(preferredModel, { attempts: 2 });
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const msg = String(err?.message || "");

    if (status === 429) {
      throw new GeminiError("Please try again in a moment", {
        status: 429,
        code: "rate_limited",
        cause: err,
      });
    }

    // If the preferred model is not accessible (or not found), retry with fallback.
    if ((status === 403 || status === 404 || status === 503) && fallbackModels.length) {
      for (const m of fallbackModels) {
        try {
          return await runWithRetry(m, { attempts: 2 });
        } catch {
          // keep trying fallbacks
        }
      }
    }

    throw new GeminiError("AI service unavailable", {
      status: status || 500,
      code:
        status === 403 && /denied access/i.test(msg)
          ? "model_access_denied"
          : "ai_service_unavailable",
      cause: err,
    });
  }
}
