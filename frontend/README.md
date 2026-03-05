# Frontend (Monolithic Layered Architecture)

This frontend follows a **single application layered design** for easier handling in this assignment.

## Layers
- `core/` - global services, guards, interceptors, config
- `features/` - feature modules (auth, patient, doctor, appointment, telemedicine, admin, payment, notification, symptom-checker)
- `shared/` - reusable components, pipes, utilities
- `layouts/` - app shell layouts for role-based views

The frontend should be asynchronous (React/Angular/jQuery+AJAX) as required by the assignment.
