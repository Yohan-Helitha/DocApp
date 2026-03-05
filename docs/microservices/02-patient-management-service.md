# Patient Management Service

## 1) What this microservice should build
- Patient profile management (create, read, update, deactivate).
- Medical report/document upload and retrieval.
- View patient medical history and past prescriptions.
- Patient-facing data required for telemedicine and appointment workflows.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Auth Service, Appointment Service, Telemedicine Service, Doctor Management Service.
- **Outgoing**: Notification Service (profile update alerts), Admin Management Service (audit/operations).

## 3) API endpoints for this microservice
- `POST /api/v1/patients`
- `GET /api/v1/patients/{patientId}`
- `PUT /api/v1/patients/{patientId}`
- `DELETE /api/v1/patients/{patientId}`
- `POST /api/v1/patients/{patientId}/medical-reports`
- `GET /api/v1/patients/{patientId}/medical-reports`
- `GET /api/v1/patients/{patientId}/medical-reports/{reportId}`
- `GET /api/v1/patients/{patientId}/medical-history`
- `GET /api/v1/patients/{patientId}/prescriptions`
