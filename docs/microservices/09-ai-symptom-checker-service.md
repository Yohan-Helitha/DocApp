# AI Symptom Checker Service (Optional)

## 1) What this microservice should build
- Symptom input processing and preliminary health suggestions.
- Recommended doctor specialty prediction.
- Risk level tagging for triage assistance.
- Logging and disclaimers that this is non-diagnostic support.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Frontend client.
- **Outgoing**: Appointment Service (specialty routing), Doctor Management Service (recommended specialty doctor list), Notification Service (optional guidance message).

## 3) API endpoints for this microservice
- `POST /api/v1/symptom-checker/analyze`
- `GET /api/v1/symptom-checker/specialties/recommendations`
- `GET /api/v1/symptom-checker/history/{patientId}`
