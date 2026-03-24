export const SMS_TEMPLATES = {
  // Appointment Service
  APPOINTMENT_BOOKED: (data) => 
    `DocApp: Hi ${data.patientName}, your appointment with Dr. ${data.doctorName} on ${data.date} at ${data.time} is confirmed.`,

  APPOINTMENT_CANCELLED: (data) => 
    `DocApp: Hi ${data.userName}, your appointment scheduled for ${data.date} has been cancelled.`,

  // Telemedicine Service
  CONSULTATION_COMPLETED: (data) => 
    `DocApp: Hi ${data.patientName}, your consultation with Dr. ${data.doctorName} is complete. View your prescription in your profile.`,

  // Payment Service
  PAYMENT_SUCCESS: (data) => 
    `DocApp: Payment of LKR ${data.amount} successful. Transaction ID: ${data.transactionId}. Thank you!`,

  // Auth / Account
  WELCOME_USER: (data) => 
    `DocApp: Welcome ${data.name}! Your ${data.role} account has been successfully created.`,

  // AI Symptom Checker
  AI_SYMPTOM_REPORT: (data) => 
    `DocApp: AI Symptom Check for ${data.symptoms} suggest focusing on ${data.specialty}. Check email for full details.`,

  // OTP / Verification (Additional common SMS use-case)
  OTP_VERIFICATION: (data) => 
    `DocApp: Your verification code is ${data.otp}. Do not share this with anyone.`
};
