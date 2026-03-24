import * as service from '../services/notificationService.js';
import logger from '../config/logger.js';

export const sendEmail = async (req, res) => {
  try {
    const { recipient_user_id, recipient_email, template_code, message, payload_json, priority } = req.body;
    
    // 1. Store in Database
    const result = await service.createNotification({
      recipient_user_id,
      channel: 'email',
      template_code,
      message,
      payload_json,
      priority
    });

    // 2. Trigger actual email via Resend
    if (recipient_email) {
      // Use template if template_code is provided
      await service.sendEmail(
        recipient_email,
        payload_json?.subject || 'Notification from DocApp',
        message,
        payload_json?.html || `<p>${message}</p>`,
        template_code, // Pass template code
        payload_json,    // Data for template placeholders
        result.id       // Pass notification ID for tracking
      );
      logger.info(`Email sent to ${recipient_email}`);
    }

    logger.info(`Email notification record created: ${result.id}`);
    
    // If request has recipient_phone, trigger SMS automatically
    if (req.body.recipient_phone) {
      // Call service instead of recursive controller call to avoid duplicating response
      const smsResult = await service.createNotification({
        recipient_user_id,
        channel: 'sms',
        template_code,
        message,
        payload_json,
        priority
      });

      await service.sendSMS(
        req.body.recipient_phone, 
        message, 
        template_code, 
        payload_json,
        smsResult.id // Pass notification ID for tracking
      );
      logger.info(`Auto-triggered SMS for user ${recipient_user_id} via send-email`);
    }

    res.status(201).json(result);
  } catch (err) {
    logger.error('Error sending email:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const sendSms = async (req, res) => {
  try {
    const { recipient_user_id, recipient_phone, template_code, message, payload_json, priority } = req.body;
    
    // 1. Store in Database
    const result = await service.createNotification({
      recipient_user_id,
      channel: 'sms',
      template_code,
      message,
      payload_json,
      priority
    });

    // 2. Trigger actual SMS via Twilio
    if (recipient_phone) {
      await service.sendSMS(
        recipient_phone, 
        message, 
        template_code, 
        payload_json,
        result.id // Pass notification ID for tracking
      );
      logger.info(`SMS sent to ${recipient_phone}`);
    }

    logger.info(`SMS notification record created: ${result.id}`);

    // If request has recipient_email, trigger email automatically
    if (req.body.recipient_email) {
      const emailResult = await service.createNotification({
        recipient_user_id,
        channel: 'email',
        template_code,
        message,
        payload_json,
        priority
      });

      await service.sendEmail(
        req.body.recipient_email,
        payload_json?.subject || 'Notification from DocApp',
        message,
        payload_json?.html || `<p>${message}</p>`,
        template_code,
        payload_json,
        emailResult.id // Pass notification ID for tracking
      );
      logger.info(`Auto-triggered Email for user ${recipient_user_id} via send-sms`);
    }

    res.status(201).json(result);
  } catch (err) {
    logger.error('Error sending SMS:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const sendBulk = async (req, res) => {
  try {
    const { recipients, channel, template_code, message, payload_json, priority } = req.body;
    
    const result = await service.createBulkNotifications(recipients, {
      channel,
      template_code,
      message,
      payload_json,
      priority
    });
    logger.info(`Bulk notifications created for ${result.length} users`);
    res.status(201).json(result);
  } catch (err) {
    logger.error('Error sending bulk notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await service.getNotificationsByUser(userId);
    res.json(result);
  } catch (err) {
    logger.error(`Error fetching notifications for user ${req.params.userId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.getNotificationById(id);
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json(result);
  } catch (err) {
    logger.error(`Error fetching notification ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.updateNotification(id, req.body);
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    logger.info(`Notification ${id} updated`);
    res.json(result);
  } catch (err) {
    logger.error(`Error updating notification ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.deleteNotification(id);
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    logger.info(`Notification ${id} deleted`);
    res.json({ message: 'Notification deleted successfully', id });
  } catch (err) {
    logger.error(`Error deleting notification ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};