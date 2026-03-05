# Appointment Service

## 1) What this microservice should build
- Doctor search by specialty and filters.
- Appointment booking, modification, cancellation.
- Real-time appointment status tracking.
- Accept/reject handling by doctor role.

## 2) Other microservices that communicate with this service
- **Incoming**: API Gateway, Frontend client.
- **Outgoing**: Doctor Management Service (availability), Patient Management Service (patient validation), Payment Service (fee flow), Notification Service (booking updates), Telemedicine Service (session linking).

## 3) API endpoints for this microservice
- `GET /api/v1/appointments/doctors/search`
- `POST /api/v1/appointments`
- `GET /api/v1/appointments/{appointmentId}`
- `PUT /api/v1/appointments/{appointmentId}`
- `DELETE /api/v1/appointments/{appointmentId}`
- `GET /api/v1/appointments/patients/{patientId}`
- `GET /api/v1/appointments/doctors/{doctorId}`
- `PUT /api/v1/appointments/{appointmentId}/status`
- `PUT /api/v1/appointments/{appointmentId}/doctor-decision`
