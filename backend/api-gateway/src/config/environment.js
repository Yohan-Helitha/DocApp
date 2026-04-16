import "dotenv/config";

const getEnv = (name, defaultValue) => process.env[name] || defaultValue;

export default {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '4000')),
  // Service URLs for internal routing
  AUTH_SERVICE_URL: getEnv('AUTH_SERVICE_URL', 'http://auth-service:4001'),
  PATIENT_SERVICE_URL: getEnv('PATIENT_SERVICE_URL', 'http://patient-management-service:6001'),
  NOTIFICATION_SERVICE_URL: getEnv('NOTIFICATION_SERVICE_URL', 'http://notification-service:6000'),
  // Gateway talks to telemedicine service on its internal port 4010
  TELEMEDICINE_SERVICE_URL: getEnv('TELEMEDICINE_SERVICE_URL', 'http://telemedicine:4010'),
  PAYMENT_SERVICE_URL: getEnv('PAYMENT_SERVICE_URL', 'http://payment-service:4006'),
  ADMIN_SERVICE_URL: getEnv('ADMIN_SERVICE_URL', 'http://admin-management-service:4008'),
  DOCTOR_SERVICE_URL: getEnv(
    "DOCTOR_SERVICE_URL",
    "http://doctor-management-service:4002",
  ),
  APPOINTMENT_SERVICE_URL: getEnv(
    "APPOINTMENT_SERVICE_URL",
    "http://appointment-service:4003",
  ),
  // Optional: after PayHere returns to /payhere/return or /payhere/cancel on the public domain,
  // we can redirect the browser back to a local app (e.g. http://localhost:8081/#/payments/return).
  // This is useful when only the payment flow is hosted via ngrok and the rest of the app runs on localhost.
  PAYHERE_DEFAULT_RETURN_TO: getEnv('PAYHERE_DEFAULT_RETURN_TO', ''),
  PAYHERE_DEFAULT_CANCEL_TO: getEnv('PAYHERE_DEFAULT_CANCEL_TO', ''),
  // Comma-separated allowlist of hosts for redirects (prevents open redirects). Examples: "localhost,127.0.0.1"
  PAYHERE_RETURN_TO_ALLOWLIST: getEnv('PAYHERE_RETURN_TO_ALLOWLIST', 'localhost,127.0.0.1'),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
};
