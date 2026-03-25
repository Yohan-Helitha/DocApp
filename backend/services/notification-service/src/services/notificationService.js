import db from '../config/db.js';
import resend from '../config/resend.js';
import twilioClient from '../config/twilio.js';
import { EMAIL_TEMPLATES } from '../templates/emailTemplates.js';
import { SMS_TEMPLATES } from '../templates/smsTemplates.js';
import { createAttempt } from './attemptService.js';

export const createNotification = async (data) => {
  const { recipient_user_id, channel, template_code, message, payload_json, priority } = data;
  const result = await db.query(
    `INSERT INTO notifications(recipient_user_id, channel, template_code, message, payload_json, priority)
     VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
    [recipient_user_id, channel, template_code, message, payload_json, priority || 'normal']
  );

  return result.rows[0];
};

export const getNotificationsByUser = async (userId) => {
  const result = await db.query(
    'SELECT * FROM notifications WHERE recipient_user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return result.rows;
};

export const getNotificationById = async (id) => {
  const result = await db.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return result.rows[0];
};

export const updateNotification = async (id, data) => {
  const { channel, template_code, message, payload_json, status, priority } = data;
  const result = await db.query(
    `UPDATE notifications 
     SET channel = COALESCE($1, channel),
         template_code = COALESCE($2, template_code),
         message = COALESCE($3, message),
         payload_json = COALESCE($4, payload_json),
         status = COALESCE($5, status),
         priority = COALESCE($6, priority),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [channel, template_code, message, payload_json, status, priority, id]
  );
  return result.rows[0];
};

export const deleteNotification = async (id) => {
  const result = await db.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};

export const createBulkNotifications = async (recipients, data) => {
  const { channel, template_code, message, payload_json, priority, recipient_emails, recipient_phones } = data;
  
  const created = [];
  for (let i = 0; i < recipients.length; i++) {
    const userId = recipients[i];
    
    // Store original channel notification
    const res = await db.query(
      `INSERT INTO notifications(recipient_user_id, channel, template_code, message, payload_json, priority)
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, channel, template_code, message, payload_json, priority || 'normal']
    );
    const notificationId = res.rows[0].id;
    created.push(res.rows[0]);

    if (channel === 'email' && recipient_emails && recipient_emails[i]) {
      await sendEmail(recipient_emails[i], payload_json?.subject || 'Bulk Notification', message, payload_json?.html || `<p>${message}</p>`, template_code, payload_json, notificationId);
    } else if (channel === 'sms' && recipient_phones && recipient_phones[i]) {
      await sendSMS(recipient_phones[i], message, template_code, payload_json, notificationId);
    }

    // Handle cross-channel auto-trigger for bulk
    if (channel === 'email' && recipient_phones && recipient_phones[i]) {
      const smsRes = await db.query(
        `INSERT INTO notifications(recipient_user_id, channel, template_code, message, payload_json, priority)
         VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, 'sms', template_code, message, payload_json, priority || 'normal']
      );
      await sendSMS(recipient_phones[i], message, template_code, payload_json, smsRes.rows[0].id);
    } else if (channel === 'sms' && recipient_emails && recipient_emails[i]) {
      const emailRes = await db.query(
        `INSERT INTO notifications(recipient_user_id, channel, template_code, message, payload_json, priority)
         VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, 'email', template_code, message, payload_json, priority || 'normal']
      );
      await sendEmail(recipient_emails[i], payload_json?.subject || 'Bulk Notification', message, payload_json?.html || `<p>${message}</p>`, template_code, payload_json, emailRes.rows[0].id);
    }
  }
  return created;
};

export const sendEmail = async (to, subject, text, html, templateCode = null, payloadData = {}, notificationId = null) => {
  try {
    let finalSubject = subject;
    let finalHtml = html;

    if (templateCode && EMAIL_TEMPLATES[templateCode]) {
      const template = EMAIL_TEMPLATES[templateCode];
      finalSubject = template.subject;
      finalHtml = template.html(payloadData);
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject: finalSubject,
      text: text || finalSubject,
      html: finalHtml,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      if (notificationId) {
        await createAttempt({
          notification_id: notificationId,
          provider: 'resend',
          provider_response: error,
          status: 'failed'
        });
      }
      throw error;
    }

    if (notificationId) {
      await createAttempt({
        notification_id: notificationId,
        provider: 'resend',
        provider_response: data,
        status: 'sent'
      });
    }

    return data;
  } catch (err) {
    console.error('Exception sending email:', err);
    if (notificationId) {
      await createAttempt({
        notification_id: notificationId,
        provider: 'resend',
        provider_response: { error: err.message },
        status: 'failed'
      });
    }
    throw err;
  }
};

export const sendSMS = async (to, message, templateCode = null, payloadData = {}, notificationId = null) => {
  try {
    let finalMessage = message;

    if (templateCode && SMS_TEMPLATES[templateCode]) {
      finalMessage = SMS_TEMPLATES[templateCode](payloadData);
    }

    const response = await twilioClient.messages.create({
      body: finalMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log('Verification: Twilio response received', response.sid);

    if (notificationId) {
      console.log('Verification: Creating attempt for ID', notificationId);
      await createAttempt({
        notification_id: notificationId,
        provider: 'twilio',
        provider_response: { sid: response.sid, status: response.status },
        status: 'sent'
      });
    }

    return response;
  } catch (err) {
    console.error('Error sending SMS via Twilio:', err);
    if (notificationId) {
      await createAttempt({
        notification_id: notificationId,
        provider: 'twilio',
        provider_response: { error: err.message },
        status: 'failed'
      });
    }
    throw err;
  }
};

