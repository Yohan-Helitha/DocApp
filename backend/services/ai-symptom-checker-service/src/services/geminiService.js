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
  // Fallback for AI Studio / projects that don't have access to gemini-2.5-flash.
  const fallbackModels = ["gemini-1.5-flash"].filter((m) => m !== preferredModel);

  const firstUserMessage =
    conversationHistory.length === 0
      ? `${SYSTEM_PROMPT}\n\nPatient says: ${message}`
      : message;

  const history = conversationHistory.length === 0 ? [] : conversationHistory;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const runOnce = async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const chat = model.startChat({ history });

    const parts = [{ text: firstUserMessage }];
    if (reportBase64) {
      parts.push({
        inlineData: { data: reportBase64, mimeType: reportMimeType },
      });
    }

    const result = await chat.sendMessage(parts);
    const rawText = result.response.text();

    const parsed = tryParseJsonFromText(rawText);
    if (parsed && typeof parsed === "object") return parsed;
    return { message: rawText, assessment_complete: false };
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

    // If the preferred model is not accessible, retry with fallback.
    if ((status === 403 || status === 503) && fallbackModels.length) {
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
