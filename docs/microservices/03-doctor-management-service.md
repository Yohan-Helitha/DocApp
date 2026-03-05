# Doctor Management Service

## 1) What this microservice should build
- Doctor profile registration and profile management.
- Doctor verification status integration (admin approval flow).
- Availability schedule management.
- Access to patient-uploaded reports during consultations.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Auth Service, Appointment Service, Telemedicine Service, Admin Management Service.
- **Outgoing**: Notification Service (availability/booking updates), Patient Management Service (fetch report metadata).

## 3) API endpoints for this microservice
- `POST /api/v1/doctors`
- `GET /api/v1/doctors/{doctorId}`
- `PUT /api/v1/doctors/{doctorId}`
- `GET /api/v1/doctors`
- `PUT /api/v1/doctors/{doctorId}/verification-status`
- `POST /api/v1/doctors/{doctorId}/availability-slots`
- `GET /api/v1/doctors/{doctorId}/availability-slots`
- `PUT /api/v1/doctors/{doctorId}/availability-slots/{slotId}`
- `DELETE /api/v1/doctors/{doctorId}/availability-slots/{slotId}`
- `GET /api/v1/doctors/{doctorId}/patients/{patientId}/reports`
