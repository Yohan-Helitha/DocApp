import { GoogleGenerativeAI } from "@google/generative-ai";
import env from "../config/environment.js";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";

const stripCodeFences = (text) =>
  String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

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
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

  const firstUserMessage =
    conversationHistory.length === 0
      ? `${SYSTEM_PROMPT}\n\nPatient says: ${message}`
      : message;

  const history = conversationHistory.length === 0 ? [] : conversationHistory;

  try {
    const chat = model.startChat({ history });

    const parts = [{ text: firstUserMessage }];
    if (reportBase64) {
      parts.push({
        inlineData: { data: reportBase64, mimeType: reportMimeType },
      });
    }

    const result = await chat.sendMessage(parts);
    const rawText = result.response.text();

    try {
      const clean = stripCodeFences(rawText);
      return JSON.parse(clean);
    } catch {
      return { message: rawText, assessment_complete: false };
    }
  } catch (err) {
    const status = err?.status || err?.response?.status;
    if (status === 429) {
      throw new GeminiError("Please try again in a moment", {
        status: 429,
        code: "rate_limited",
        cause: err,
      });
    }
    throw new GeminiError("AI service unavailable", {
      status: 500,
      code: "ai_service_unavailable",
      cause: err,
    });
  }
}
