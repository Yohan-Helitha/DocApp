# AI Symptom Checker Service Specification (Optional)

## 1. What this microservice should build
- Symptom analysis with preliminary suggestions and specialty recommendations.

## 2. Communicating microservices
- Appointment Service, Doctor Management Service, Notification Service.

## 3. API endpoints
- `POST /api/v1/symptom-checker/analyze`
- `GET /api/v1/symptom-checker/specialties/recommendations`
- `GET /api/v1/symptom-checker/history/{patientId}`
