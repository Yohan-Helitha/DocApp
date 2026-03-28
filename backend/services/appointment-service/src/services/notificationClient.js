/**
 * notificationClient.js — HTTP client for notification-service.
 *
 * notification-service's verifyIdentity middleware expects:
 *   x-user-id   — the ID of the user on whose behalf the call is made
 *   x-user-role — their role
 *
 * Notification failures must NOT abort the primary operation (booking, cancellation, etc.).
 * Controllers catch errors from these functions individually.
 */

import axios from "axios";
import env from "../config/environment.js";

const BASE = `${env.NOTIFICATION_SERVICE_URL}/api/v1/notifications`;

/**
 * Send an email notification.
 * @param {object} opts
 * @param {string} opts.callerId        req.user.id  — for x-user-id header
 * @param {string} opts.callerRole      req.user.role — for x-user-role header
 * @param {string} opts.recipient_user_id
 * @param {string} opts.recipient_email
 * @param {string} opts.message         Plain-text message body
 * @param {string} [opts.template_code]
 * @param {object} [opts.payload_json]  Extra data for the template
 */
export const sendEmail = async ({
  callerId,
  callerRole,
  recipient_user_id,
  recipient_email,
  message,
  template_code,
  payload_json,
}) => {
  await axios.post(
    `${BASE}/send-email`,
    {
      recipient_user_id,
      recipient_email,
      channel: "email",
      message,
      ...(template_code && { template_code }),
      ...(payload_json && { payload_json }),
    },
    {
      headers: {
        "x-user-id": callerId,
        "x-user-role": callerRole,
      },
    },
  );
};
