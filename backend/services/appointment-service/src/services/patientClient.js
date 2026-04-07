/**
 * patientClient.js — HTTP client for patient-management-service.
 *
 * INTEGRATION HOOK — currently returns null (patient-service not yet available).
 *
 * What the patient-management-service teammate must build before this activates:
 *
 *   GET /api/v1/patients/by-user/:userId
 *   Auth: X-Internal-Secret: <shared internal secret>
 *   Response: {
 *     patient: {
 *       patient_id: "uuid",      // patient-service's own primary key
 *       user_id:    "uuid",      // auth-service user_id (same as JWT sub)
 *       full_name:  "string",
 *       email:      "string",
 *       phone:      "string | null"
 *     }
 *   }
 *
 * Why this endpoint is needed:
 *   - appointment-service only knows user_id (from the JWT sub claim)
 *   - patient-service has its own patient_id primary key
 *   - This endpoint lets appointment-service resolve user_id → full_name
 *     without caring about patient_id internals
 *   - The same endpoint solves the ID resolution problem in TEAMMATE_COORDINATION.md
 *     Items 2 and 6 (prescription sync and medical reports cross-service lookup)
 *
 * Once the teammate builds the endpoint:
 *   1. Set PATIENT_SERVICE_URL in appointment-service .env
 *   2. In appointmentController.bookAppointment, replace the `patient_name: null`
 *      line with:
 *        const patient = await patientClient.getPatientByUserId(req.user.id);
 *        patient_name: patient?.full_name ?? null,
 *   3. Import patientClient at the top of appointmentController.js
 */

import axios from "axios";
import env from "../config/environment.js";

/**
 * Look up a patient's profile by their auth user_id.
 * Returns null if patient-service is unavailable — booking must never fail because of this.
 *
 * @param {string} userId  The patient's user_id (JWT sub claim)
 * @returns {{ patient_id, user_id, full_name, email, phone } | null}
 */
export const getPatientByUserId = async (userId) => {
  try {
    const { data } = await axios.get(
      `${env.PATIENT_SERVICE_URL}/api/v1/patients/by-user/${userId}`,
      {
        headers: { "X-Internal-Secret": env.INTERNAL_SECRET },
        timeout: 2000,
      },
    );
    return data.patient ?? null;
  } catch {
    // Fail silently — a patient-service outage must never block appointment booking.
    return null;
  }
};
