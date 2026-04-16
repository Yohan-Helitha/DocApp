# AI Symptom Checker Microservice — Developer Guidance

## Overview

This document guides the developer (or an AI coding assistant) in building the
`ai-symptom-checker` microservice for the SmartHealth AI platform.

- **Port:** `4009`
- **Technology:** Node.js + Express
- **AI Provider:** Google Gemini API (`gemini-2.5-flash`)
- **Database:** PostgreSQL (two tables: `symptom_checks`, `symptom_check_feedback`)
- **Auth:** JWT — validated via `authMiddleware` (same pattern as other services)
- **Role allowed:** `patient` only (enforce in middleware)

---

## Google Gemini API — Setup

### 1. Get API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key (free tier: 1,500 req/day, no credit card needed).
3. Add to `.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 2. Install SDK

```bash
npm install @google/generative-ai
```

### 3. Basic call pattern

```js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

const result = await model.generateContent(prompt);
const text = result.response.text();
```

### 4. Multimodal call (for medical report image/PDF analysis — optional)

```js
// Convert uploaded file to base64 inline data part
const filePart = {
  inlineData: {
    data: base64String,         // base64 encoded file
    mimeType: "image/jpeg",     // or "application/pdf"
  },
};
const textPart = { text: systemPrompt };

const result = await model.generateContent([textPart, filePart]);
```

---

## System Prompt (Core Instruction to Gemini)

Use this as the system-level instruction injected before every conversation.
Store it in `src/prompts/systemPrompt.js`.

```js
export const SYSTEM_PROMPT = `
You are a medical triage assistant embedded in the SmartHealth AI platform.
Your role is to help patients understand their symptoms and guide them toward
the right medical specialist. You are NOT a doctor and must always include a
disclaimer.

RULES:
1. Listen carefully to the patient's described symptoms.
2. Ask at most 2-3 clarifying follow-up questions if needed (e.g., duration,
   severity, associated symptoms). Do not over-question.
3. After sufficient information, provide:
   a. A brief preliminary assessment of the most likely condition(s) —
      framed as possibilities, not diagnoses.
   b. A recommended medical specialty (e.g., "Cardiology", "Dermatology",
      "General Practice", "Neurology").
   c. A risk level: "low", "medium", or "high".
   d. An action recommendation (e.g., "Book an appointment soon",
      "Seek emergency care immediately", "Monitor at home for 48 hours").
4. Always end your response with this disclaimer:
   "⚠️ This is a preliminary AI assessment and is NOT a medical diagnosis.
    Please consult a qualified doctor for proper evaluation."
5. If the patient describes emergency symptoms (chest pain + shortness of
   breath, stroke signs, heavy bleeding, loss of consciousness), immediately
   advise them to call emergency services (1990 in Sri Lanka) and do not
   continue the chat flow.
6. Do not prescribe medications.
7. Respond in a warm, empathetic, and clear tone.

RESPONSE FORMAT (for the final assessment turn only — return as JSON):
{
  "message": "<your full conversational reply to show in chat>",
  "assessment_complete": true,
  "predicted_specialty": "<specialty string>",
  "risk_level": "low | medium | high",
  "action_recommendation": "<short string>"
}

For follow-up/clarifying turns (not the final assessment), return:
{
  "message": "<your question or partial response>",
  "assessment_complete": false
}
`;
```

---

## API Endpoints

All routes are under `/api/v1/symptom-checker` and require a valid JWT.

### POST `/api/v1/symptom-checker/analyze`

Accepts a patient's symptom message (single turn or continuing conversation).
Sends the full conversation history to Gemini to maintain context.

**Request body:**
```json
{
  "message": "I have a severe headache and blurry vision since yesterday",
  "conversation_history": [],
  "report_base64": null,
  "report_mime_type": null
}
```

- `message` — the patient's latest message
- `conversation_history` — array of `{ role: "user"|"model", parts: [{ text }] }` objects from previous turns (send from frontend state)
- `report_base64` — optional: base64 of uploaded medical report
- `report_mime_type` — optional: `"image/jpeg"`, `"image/png"`, or `"application/pdf"`

**Response:**
```json
{
  "message": "I understand you've had a severe headache with blurry vision...",
  "assessment_complete": false
}
```
or on final turn:
```json
{
  "message": "Based on your symptoms...\n\n⚠️ This is a preliminary AI assessment...",
  "assessment_complete": true,
  "predicted_specialty": "Neurology",
  "risk_level": "high",
  "action_recommendation": "Book an appointment urgently",
  "check_id": "uuid-of-saved-record"
}
```

**Controller logic (`analyzeSymptoms`):**
1. Extract `patientId` from JWT (`req.user.id`).
2. Build Gemini chat history from `conversation_history`.
3. If `report_base64` is provided, include it as a multimodal part.
4. Call Gemini with the system prompt prepended to the first user message.
5. Parse the JSON from Gemini's response text.
6. If `assessment_complete === true`, save to `symptom_checks` table and call
   the Doctor Management Service to fetch available doctors for the specialty.
7. Return the Gemini message + doctor list.

---

### GET `/api/v1/symptom-checker/specialties/recommendations`

Returns available doctors in the system for a given specialty by calling
the Doctor Management Service (port `4002`).

**Query params:** `?specialty=Neurology`

**Internal call:**
```js
const res = await fetch(
  `http://doctor-service:4002/api/v1/doctors?specialization=${specialty}&verification_status=approved`,
  { headers: { Authorization: req.headers.authorization } }
);
```

**Response:**
```json
{
  "specialty": "Neurology",
  "doctors": [
    {
      "doctor_id": "uuid",
      "full_name": "Dr. Priya Fernando",
      "specialization": "Neurology",
      "consultation_fee": 2500,
      "experience_years": 8
    }
  ],
  "fallback_message": null
}
```

If no doctors found for that specialty:
```json
{
  "specialty": "Neurology",
  "doctors": [],
  "fallback_message": "No Neurologists are currently available on the platform. We recommend consulting a Neurologist at your nearest hospital."
}
```

---

### GET `/api/v1/symptom-checker/history/:patientId`

Returns past symptom check records for a patient.

**Auth check:** Patients can only view their own history (`req.user.id === patientId`).

**Response:**
```json
[
  {
    "check_id": "uuid",
    "predicted_specialty": "Neurology",
    "risk_level": "high",
    "suggestion_text": "Based on your symptoms...",
    "created_at": "2026-04-15T10:30:00Z"
  }
]
```

---

### POST `/api/v1/symptom-checker/feedback`

Patient submits feedback after a completed session.

**Request body:**
```json
{
  "check_id": "uuid",
  "patient_feedback": "The suggestion was accurate.",
  "rating": 5
}
```

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS symptom_checks (
  check_id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID          NOT NULL,
  input_symptoms_json JSONB         NOT NULL,   -- full conversation history
  predicted_specialty TEXT,
  risk_level          TEXT          CHECK (risk_level IN ('low', 'medium', 'high')),
  suggestion_text     TEXT,
  model_version       TEXT          DEFAULT 'gemini-2.0-flash',
  created_at          TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS symptom_check_feedback (
  feedback_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id            UUID          NOT NULL REFERENCES symptom_checks(check_id),
  patient_feedback    TEXT,
  rating              INTEGER       CHECK (rating BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ   DEFAULT now()
);
```

---

## Inter-Service Communication

| Direction     | Target Service          | Port   | Purpose                                         |
|---------------|-------------------------|--------|-------------------------------------------------|
| Incoming      | API Gateway / Frontend  | —      | Patient chat messages                           |
| Outgoing      | Doctor Management       | `4002` | Fetch doctors by specialty after assessment     |
| Outgoing      | Notification Service    | varies | Optional: send health tip notification          |

Use `node-fetch` or the native `fetch` (Node 18+) for inter-service calls.
In Docker Compose, use service names (e.g., `http://doctor-service:4002`).
In localhost dev, use `http://localhost:4002`.

---

## Conversation Flow (Frontend ↔ Service)

```
Patient clicks "Start AI Assessment"
      │
      ▼
Frontend: renders chat UI, initialises conversation_history = []
      │
      ▼ Patient types first message
POST /api/v1/symptom-checker/analyze
  { message, conversation_history: [] }
      │
      ▼ Service calls Gemini with SYSTEM_PROMPT + message
      │ Gemini replies with clarifying question
      │ assessment_complete: false
      ▼
Frontend: appends to conversation_history, shows reply in chat
      │
      ▼ Patient replies again
POST /api/v1/symptom-checker/analyze
  { message, conversation_history: [{...}, {...}] }
      │
      ▼ Gemini has enough context now
      │ assessment_complete: true
      │ predicted_specialty: "Cardiology"
      │ Service fetches matching doctors from Doctor Service
      ▼
Frontend: shows assessment + doctor cards with "Book Appointment" buttons
```

---

## Error Handling

| Scenario                              | HTTP Status | Response                                        |
|---------------------------------------|-------------|-------------------------------------------------|
| Gemini API key invalid                | 500         | `{ error: "AI service unavailable" }`           |
| Gemini rate limit hit                 | 429         | `{ error: "Please try again in a moment" }`     |
| Patient JWT missing/invalid           | 401         | `{ error: "Unauthorized" }`                     |
| patientId mismatch in history route   | 403         | `{ error: "Forbidden" }`                        |
| Doctor service unreachable            | 200 (graceful) | Return assessment + `fallback_message`       |

Always wrap Gemini calls in try/catch. If Gemini's response is not valid JSON,
return the raw text as the `message` field with `assessment_complete: false`.

---

## .env Template

```env
PORT=4009
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=symptom_checker_db
DB_USER=postgres
DB_PASSWORD=yourpassword

# JWT (shared secret across all services)
JWT_SECRET=your_shared_jwt_secret

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# Inter-service URLs
DOCTOR_SERVICE_URL=http://localhost:4002
NOTIFICATION_SERVICE_URL=http://localhost:4005
```

---

## Recommended Directory Structure

```
ai-symptom-checker/
├── src/
│   ├── controllers/
│   │   └── symptomController.js
│   ├── routes/
│   │   └── symptomRoutes.js
│   ├── services/
│   │   ├── geminiService.js       ← all Gemini API logic here
│   │   └── doctorService.js       ← inter-service call to port 4002
│   ├── prompts/
│   │   └── systemPrompt.js        ← SYSTEM_PROMPT constant
│   ├── middleware/
│   │   └── authMiddleware.js      ← same JWT middleware as other services
│   ├── db/
│   │   ├── pool.js
│   │   └── migrations/
│   │       └── 001_create_tables.sql
│   └── app.js
├── .env
├── package.json
└── Dockerfile
```

---

## Gemini Conversation History Format (Important)

Gemini requires alternating `user` and `model` roles. The frontend must maintain
and send the full history on each request. Do NOT send the system prompt as part
of history — inject it only as the first message prefix in your service.

```js
// geminiService.js
export async function analyzeSymptoms({ message, conversationHistory, reportBase64, reportMimeType }) {
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

  // Inject system prompt into the first user message
  const firstUserMessage = conversationHistory.length === 0
    ? `${SYSTEM_PROMPT}\n\nPatient says: ${message}`
    : message;

  const history = conversationHistory.length === 0 ? [] : conversationHistory;

  const chat = model.startChat({ history });

  const parts = [{ text: firstUserMessage }];
  if (reportBase64) {
    parts.push({ inlineData: { data: reportBase64, mimeType: reportMimeType } });
  }

  const result = await chat.sendMessage(parts);
  const rawText = result.response.text();

  try {
    // Strip markdown code fences if Gemini wraps JSON in ```json
    const clean = rawText.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { message: rawText, assessment_complete: false };
  }
}
```

---

## Docker Compose snippet

```yaml
ai-symptom-checker:
  build: ./ai-symptom-checker
  ports:
    - "4009:4009"
  environment:
    - PORT=4009
    - DB_HOST=postgres
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - GEMINI_MODEL=gemini-2.0-flash
    - JWT_SECRET=${JWT_SECRET}
    - DOCTOR_SERVICE_URL=http://doctor-service:4002
  depends_on:
    - postgres
```

---

## Report Section Notes (for assignment report.pdf)

When writing about this service in the report, include:

- **Service Interface:** Three endpoints listed above + feedback endpoint
- **AI Model Used:** Google Gemini 2.0 Flash (multimodal LLM)
- **Why Gemini:** Free tier, multimodal (text + image/PDF), low latency, no VPN
  required from Sri Lanka, REST-compatible
- **Security:** JWT auth, patient can only access own history, no medication
  prescriptions issued, mandatory disclaimer on every AI response
- **Disclaimer Strategy:** Embedded in system prompt so it cannot be omitted
- **Risk Tagging:** `low / medium / high` stored in DB for audit trail
- **Non-diagnostic stance:** Clearly stated in system prompt; framed as
  "preliminary suggestion" not diagnosis