export const EMAIL_TEMPLATES = {
  // Helpers
  // Minimal HTML escaping for dynamic fields.
  // (Avoids accidental HTML injection in notification templates.)
  _escape: {
    html: (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'),
  },

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
        <p>Hello ${EMAIL_TEMPLATES._escape.html(data.patientName || data.userName || 'Patient')},</p>
        <p>
          We have received your payment of <strong>${EMAIL_TEMPLATES._escape.html(data.currency || 'LKR')} ${EMAIL_TEMPLATES._escape.html(data.amount || '')}</strong>
          for the consultation fee.
        </p>
        ${data.transactionId ? `<p><strong>Transaction ID:</strong> ${EMAIL_TEMPLATES._escape.html(data.transactionId)}</p>` : ''}
        ${data.paymentMethod ? `<p><strong>Payment method:</strong> ${EMAIL_TEMPLATES._escape.html(data.paymentMethod)}</p>` : ''}
        ${data.cardLast4 ? `<p><strong>Card (last 4):</strong> ${EMAIL_TEMPLATES._escape.html(data.cardLast4)}</p>` : ''}
      </div>
    `
  },

  PAYMENT_INVOICE: {
    subject: 'Invoice - DocApp',
    text: (data) => {
      const val = (v, fallback = '-') => {
        const s = String(v ?? '').trim();
        return s ? s : fallback;
      };
      const currency = val(data.currency, 'LKR');
      const amount = val(data.amount, '-');
      const method = val(data.paymentMethod, 'Card');
      const last4 = String(data.cardLast4 ?? '').trim();
      const slot = val(data.slot, '-');
      const transactionId = val(data.transactionId, '-');
      const appointmentId = val(data.appointmentId, '-');
      const doctorName = val(data.doctorName, '-');
      const doctorEmail = val(data.doctorEmail, '-');
      const patientName = val(data.patientName, 'Patient');
      const patientEmail = val(data.patientEmail, '-');

      const methodLine = last4 ? `${method} (last 4: ${last4})` : method;

      return [
        'Invoice (PAID) - DocApp',
        '',
        `Hello ${patientName},`,
        '',
        'Your payment has been confirmed. Invoice details:',
        '',
        `Amount: ${currency} ${amount}`,
        `Method: ${methodLine}`,
        `Booked slot: ${slot}`,
        '',
        `Doctor: ${doctorName}`,
        `Doctor email: ${doctorEmail}`,
        `Patient email: ${patientEmail}`,
        '',
        `Appointment ID: ${appointmentId}`,
        `Transaction ID: ${transactionId}`,
        '',
        'This is an automated invoice from DocApp.',
      ].join('\n');
    },
    html: (data) => {
      const esc = EMAIL_TEMPLATES._escape.html;
      const val = (v, fallback = '-') => {
        const s = String(v ?? '').trim();
        return s ? s : fallback;
      };

      const currency = esc(val(data.currency, 'LKR'));
      const amount = esc(val(data.amount, '-'));
      const method = esc(val(data.paymentMethod, 'Card'));
      const last4Raw = String(data.cardLast4 ?? '').trim();
      const last4 = last4Raw ? esc(last4Raw) : '';

      const patientName = esc(val(data.patientName, 'Patient'));
      const patientEmail = esc(val(data.patientEmail, '-'));
      const doctorName = esc(val(data.doctorName, '-'));
      const doctorEmail = esc(val(data.doctorEmail, '-'));
      const appointmentId = esc(val(data.appointmentId, '-'));
      const transactionId = esc(val(data.transactionId, '-'));
      const slot = esc(val(data.slot, '-'));

      return `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.45;">
          <h2 style="margin: 0 0 10px;">Invoice (Paid)</h2>
          <p style="margin: 0 0 14px;">Hello ${patientName},</p>
          <p style="margin: 0 0 16px;">Your payment has been confirmed. Invoice details are below.</p>

          <div style="border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; padding: 14px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #334155; font-weight: 700;">Amount</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${currency} ${amount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-weight: 700;">Method</td>
                <td style="padding: 6px 0; color: #0f172a; text-align: right;">${method}${last4 ? ` (•••• ${last4})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-weight: 700;">Booked slot</td>
                <td style="padding: 6px 0; color: #0f172a; text-align: right;">${slot}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 10px 0 0;">
                  <div style="height: 1px; background: #e2e8f0;"></div>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0 6px; color: #334155; font-weight: 700;">Doctor</td>
                <td style="padding: 10px 0 6px; color: #0f172a; text-align: right;">${doctorName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-weight: 700;">Doctor email</td>
                <td style="padding: 6px 0; color: #0f172a; text-align: right;">${doctorEmail}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-weight: 700;">Patient email</td>
                <td style="padding: 6px 0; color: #0f172a; text-align: right;">${patientEmail}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 10px 0 0;">
                  <div style="height: 1px; background: #e2e8f0;"></div>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0 6px; color: #334155; font-weight: 700;">Appointment ID</td>
                <td style="padding: 10px 0 6px; color: #0f172a; text-align: right; font-family: monospace;">${appointmentId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #334155; font-weight: 700;">Transaction ID</td>
                <td style="padding: 6px 0; color: #0f172a; text-align: right; font-family: monospace;">${transactionId}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">This is an automated invoice from DocApp.</p>
        </div>
      `;
    },
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
