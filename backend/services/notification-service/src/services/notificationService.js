import sequelize from '../config/database.js'; // Ensure Sequelize is initialized
import resend from '../config/resend.js';
import twilioClient from '../config/twilio.js';
import { EMAIL_TEMPLATES } from '../templates/emailTemplates.js';
import { SMS_TEMPLATES } from '../templates/smsTemplates.js';
import { createAttempt } from './attemptService.js';
import Notification from '../models/notificationModel.js';

export const createNotification = async (data) => {
  return await Notification.create(data);
};

export const getNotificationsByUser = async (userId) => {
  return await Notification.findAll({
    where: { recipient_user_id: userId },
    order: [['created_at', 'DESC']]
  });
};

export const getLatestInAppNotificationsByUser = async (userId, limit = 5) => {
  const n = Number(limit);
  const safeLimit = Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 5;

  return await Notification.findAll({
    where: { recipient_user_id: userId, channel: 'in-app' },
    order: [['created_at', 'DESC']],
    limit: safeLimit,
  });
};

export const getNotificationById = async (id) => {
  return await Notification.findByPk(id);
};

export const updateNotification = async (id, data) => {
  const notification = await Notification.findByPk(id);
  if (!notification) return null;
  return await notification.update(data);
};

export const deleteNotification = async (id) => {
  const notification = await Notification.findByPk(id);
  if (!notification) return null;
  await notification.destroy();
  return notification;
};

export const createBulkNotifications = async (recipients, data) => {
  const { channel, template_code, message, payload_json, priority, recipient_emails, recipient_phones } = data;
  
  const created = [];
  for (let i = 0; i < recipients.length; i++) {
    const userId = recipients[i];
    
    // Store original channel notification
    const notification = await Notification.create({
      recipient_user_id: userId,
      channel,
      template_code,
      message,
      payload_json,
      priority: priority || 'normal'
    });
    const notificationId = notification.id;
    created.push(notification);

    if (channel === 'email' && recipient_emails && recipient_emails[i]) {
      await sendEmail(recipient_emails[i], payload_json?.subject || 'Bulk Notification', message, payload_json?.html || `<p>${message}</p>`, template_code, payload_json, notificationId);
    } else if (channel === 'sms' && recipient_phones && recipient_phones[i]) {
      await sendSMS(recipient_phones[i], message, template_code, payload_json, notificationId);
    }

    if (channel === 'email' && recipient_phones && recipient_phones[i]) {
      const smsNotification = await Notification.create({
        recipient_user_id: userId,
        channel: 'sms',
        template_code,
        message,
        payload_json,
        priority: priority || 'normal'
      });
      await sendSMS(recipient_phones[i], message, template_code, payload_json, smsNotification.id);
    } else if (channel === 'sms' && recipient_emails && recipient_emails[i]) {
      const emailNotification = await Notification.create({
        recipient_user_id: userId,
        channel: 'email',
        template_code,
        message,
        payload_json,
        priority: priority || 'normal'
      });
      await sendEmail(recipient_emails[i], payload_json?.subject || 'Bulk Notification', message, payload_json?.html || `<p>${message}</p>`, template_code, payload_json, emailNotification.id);
    }
  }
  return created;
};

export const sendEmail = async (to, subject, text, html, templateCode = null, payloadData = {}, notificationId = null) => {
  try {
    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text || subject;

    if (templateCode && EMAIL_TEMPLATES[templateCode]) {
      const template = EMAIL_TEMPLATES[templateCode];
      finalSubject = template.subject;
      finalHtml = template.html(payloadData);
      if (!text && typeof template.text === 'function') {
        finalText = template.text(payloadData);
      }
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject: finalSubject,
      text: text || finalText || finalSubject,
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

