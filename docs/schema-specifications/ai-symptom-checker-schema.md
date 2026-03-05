# AI Symptom Checker Schema Specification (Optional)

## Entities
1. `symptom_checks`
- `check_id` (UUID, PK)
- `patient_id` (UUID)
- `input_symptoms_json`
- `predicted_specialty`
- `risk_level` (low/medium/high)
- `suggestion_text`
- `model_version`
- `created_at`

2. `symptom_check_feedback`
- `feedback_id` (UUID, PK)
- `check_id` (UUID, FK -> symptom_checks)
- `patient_feedback`
- `rating`
- `created_at`
