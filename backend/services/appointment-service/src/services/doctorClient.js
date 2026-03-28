/**
 * doctorClient.js — HTTP client for doctor-management-service.
 *
 * Two auth modes:
 *  1. Forward the caller's Bearer token  — for read-only lookups (GET endpoints
 *     that accept "any valid JWT").
 *  2. Service JWT (role='service')        — for slot status updates, which require
 *     a trusted caller but not a specific user identity.  The service JWT is
 *     signed with the shared JWT_SECRET and expires in 1 minute to limit exposure.
 */

import axios from "axios";
import jwt from "jsonwebtoken";
import env from "../config/environment.js";

// Mint a short-lived service JWT so doctor-management-service's authMiddleware
// accepts the call.  assertSlotOwner allows role='service'.
const mintServiceToken = () =>
  jwt.sign(
    {
      sub: "appointment-service",
      email: "service@docapp.internal",
      role: "service",
    },
    env.JWT_SECRET,
    { expiresIn: "1m" },
  );

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Search doctors — proxies query params to GET /api/v1/doctors.
 * @param {string} bearerToken   The caller's "Bearer <token>" string from req.headers.authorization
 * @param {object} params        Query params object (specialization, name, etc.)
 */
export const searchDoctors = async (bearerToken, params = {}) => {
  const { data } = await axios.get(`${env.DOCTOR_SERVICE_URL}/api/v1/doctors`, {
    headers: { Authorization: bearerToken },
    params,
  });
  return data.doctors;
};

/**
 * Fetch a single doctor profile.
 * @param {string} bearerToken   The caller's "Bearer <token>" string
 * @param {string} doctorId      UUID of the doctor
 */
export const getDoctor = async (bearerToken, doctorId) => {
  const { data } = await axios.get(
    `${env.DOCTOR_SERVICE_URL}/api/v1/doctors/${doctorId}`,
    { headers: { Authorization: bearerToken } },
  );
  return data.doctor;
};

/**
 * Update a slot's status (available / booked).
 * Uses a service JWT — no user identity required.
 * @param {string} doctorId
 * @param {string} slotId
 * @param {'available'|'booked'} status
 */
export const updateSlotStatus = async (doctorId, slotId, status) => {
  const token = mintServiceToken();
  await axios.put(
    `${env.DOCTOR_SERVICE_URL}/api/v1/doctors/${doctorId}/availability-slots/${slotId}`,
    { slot_status: status },
    { headers: { Authorization: `Bearer ${token}` } },
  );
};
