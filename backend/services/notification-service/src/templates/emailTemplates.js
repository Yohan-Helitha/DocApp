export const EMAIL_TEMPLATES = {
  // Appointment Service
  APPOINTMENT_BOOKED: {
    subject: 'Appointment Confirmation - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Appointment Confirmed!</h2>
        <p>Hello ${data.patientName},</p>
        <p>Your appointment with <strong>Dr. ${data.doctorName}</strong> has been successfully booked.</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.time}</p>
        <p>Thank you for choosing DocApp.</p>
      </div>
    `
  },
  PAYMENT_REMINDER: {
    subject: 'Payment Reminder - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Payment Required</h2>
        <p>Hello ${data.patientName},</p>
        <p>Your appointment with <strong>Dr. ${data.doctorName}</strong> has been confirmed.</p>
        <p>Please complete your payment within <strong>${data.remainingHours}</strong> hour(s).</p>
        ${data.deadline ? `<p><strong>Payment deadline:</strong> ${data.deadline}</p>` : ''}
        ${data.date ? `<p><strong>Appointment date:</strong> ${data.date}</p>` : ''}
        ${data.time ? `<p><strong>Appointment time:</strong> ${data.time}</p>` : ''}
        <p>Thank you for choosing DocApp.</p>
      </div>
    `
  },
  APPOINTMENT_CANCELLED: {
    subject: 'Appointment Cancelled - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Appointment Cancelled</h2>
        <p>Hello ${data.userName},</p>
        <p>The appointment scheduled for <strong>${data.date}</strong> has been cancelled.</p>
        <p>If this was a mistake, please visit the portal to re-book.</p>
      </div>
    `
  },

  // Telemedicine Service
  TELEMEDICINE_SESSION_CONFIGURED: {
    subject: 'Telemedicine Session Scheduled - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Telemedicine Session Scheduled</h2>
        <p>Hello ${data.patientName},</p>
        <p>Your telemedicine session for the appointment with <strong>Dr. ${data.doctorName}</strong> has been configured.</p>
        ${data.date ? `<p><strong>Date:</strong> ${data.date}</p>` : ''}
        ${data.time ? `<p><strong>Time:</strong> ${data.time}</p>` : ''}
        <p>You will be able to join during your appointment time window.</p>
      </div>
    `
  },
  TELEMEDICINE_SESSION_STARTED: {
    subject: 'Telemedicine Session Started - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Telemedicine Session Started</h2>
        <p>Hello ${data.patientName},</p>
        <p>Your telemedicine session for the appointment with <strong>Dr. ${data.doctorName}</strong> has started.</p>
        <p>You can join from the Telemedicine section in your dashboard.</p>
      </div>
    `
  },
  TELEMEDICINE_SESSION_ENDED: {
    subject: 'Telemedicine Session Ended - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Telemedicine Session Ended</h2>
        <p>Hello ${data.patientName},</p>
        <p>Your telemedicine session for the appointment with <strong>Dr. ${data.doctorName}</strong> has ended.</p>
        <p>Thank you for using DocApp.</p>
      </div>
    `
  },
  CONSULTATION_COMPLETED: {
    subject: 'Consultation Summary - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Consultation Completed</h2>
        <p>Hello ${data.patientName},</p>
        <p>Your video consultation with <strong>Dr. ${data.doctorName}</strong> is now complete.</p>
        <p>You can view your digital prescription in your medical history profile.</p>
      </div>
    `
  },

  // Payment Service
  PAYMENT_SUCCESS: {
    subject: 'Payment Receipt - DocApp',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Payment Successful</h2>
        <p>Hello ${data.userName},</p>
        <p>We have received your payment of <strong>LKR ${data.amount}</strong> for the consultation fee.</p>
        <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
      </div>
    `
  },

  // Auth / Account
  WELCOME_USER: {
    subject: 'Welcome to DocApp!',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to DocApp, ${data.name}!</h2>
        <p>Your account as a ${data.role} has been successfully created.</p>
        <p>You can now log in and start using our digital healthcare services.</p>
      </div>
    `
  },

  // AI Symptom Checker
  AI_SYMPTOM_REPORT: {
    subject: 'Your AI Symptom Check Report',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>AI Symptom Check Results</h2>
        <p>Based on the symptoms you provided: <em>${data.symptoms}</em></p>
        <p><strong>Preliminary Suggestions:</strong> ${data.suggestions}</p>
        <p><strong>Recommended Specialty:</strong> ${data.specialty}</p>
        <p><small>*Note: This is an AI-generated suggestion and not a formal medical diagnosis.</small></p>
      </div>
    `
  }
};
