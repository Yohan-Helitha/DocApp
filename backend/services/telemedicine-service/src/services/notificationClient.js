/**
 * notificationClient.js — HTTP client for notification-service.
 *
 * notification-service's verifyIdentity middleware expects:
 *   x-user-id   — the ID of the user on whose behalf the call is made
 *   x-user-role — their role
 */

import axios from 'axios';
import env from '../config/environment.js';

const baseUrl = String(env.NOTIFICATION_SERVICE_URL || '').replace(/\/$/, '');
const BASE = `${baseUrl}/api/v1/notifications`;

export const sendEmail = async ({
  callerId,
  callerRole,
  recipient_user_id,
  recipient_email,
  message,
  template_code,
  payload_json,
}) => {
  if (!baseUrl) return;

  await axios.post(
    `${BASE}/send-email`,
    {
      recipient_user_id,
      recipient_email,
      channel: 'email',
      message,
      ...(template_code && { template_code }),
      ...(payload_json && { payload_json }),
    },
    {
      headers: {
        'x-user-id': String(callerId),
        'x-user-role': String(callerRole || 'user'),
      },
    },
  );
};
