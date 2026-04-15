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
      try {
        await service.sendEmail(
          recipient_email,
          payload_json?.subject || 'Notification from DocApp',
          message,
          payload_json?.html || `<p>${message}</p>`,
          template_code,
          payload_json,
          result.id
        );
        await result.update({ status: 'SENT' });
        logger.info(`✅ Email successfully sent to ${recipient_email} for user ${recipient_user_id} (notif_id: ${result.id})`);
      } catch (deliveryErr) {
        logger.error(`❌ Email delivery FAILED to ${recipient_email}: ${deliveryErr.message}`);
        await result.update({ status: 'FAILED' });
      }
    }

    logger.info(`Email notification record created: ${result.id}`);

    // Auto-trigger SMS if phone provided
    if (req.body.recipient_phone) {
      const smsResult = await service.createNotification({
        recipient_user_id,
        channel: 'sms',
        template_code,
        message,
        payload_json,
        priority
      });

      try {
        await service.sendSMS(
          req.body.recipient_phone,
          message,
          template_code,
          payload_json,
          smsResult.id
        );
        await smsResult.update({ status: 'SENT' });
        logger.info(`Auto-triggered SMS SENT for user ${recipient_user_id} via send-email`);
      } catch (smsErr) {
        await smsResult.update({ status: 'FAILED' });
        logger.error(`Auto-triggered SMS FAILED to ${req.body.recipient_phone}: ${smsErr.message}`);
      }
    }

    // Create an in-app notification record if it's a templated event (THIS IS WHAT USERS SEE IN FRONTEND)
    if (template_code) {
      await service.createNotification({
        recipient_user_id,
        channel: 'in-app',
        template_code,
        message: message || `New ${template_code.replace(/_/g, ' ')} alert`,
        payload_json,
        priority,
        status: 'SENT' // In-app is "sent" immediately upon creation
      });
      logger.info(`Recorded In-App notification for user ${recipient_user_id} (@${template_code})`);
    }

    res.status(201).json(result);
  } catch (err) {
    logger.error(`Error sending email: ${err.message || JSON.stringify(err)}`);
    console.log('Full Error Details:', err);
    res.status(500).json({ error: err.message || err });
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
      try {
        await service.sendSMS(
          recipient_phone, 
          message, 
          template_code, 
          payload_json,
          result.id // Pass notification ID for tracking
        );
        await result.update({ status: 'SENT' });
        logger.info(`✅ SMS successfully sent to ${recipient_phone} for user ${recipient_user_id}`);
      } catch (deliveryErr) {
        await result.update({ status: 'FAILED' });
        logger.error(`❌ SMS delivery FAILED to ${recipient_phone}: ${deliveryErr.message}`);
      }
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

      try {
        await service.sendEmail(
          req.body.recipient_email,
          payload_json?.subject || 'Notification from DocApp',
          message,
          payload_json?.html || `<p>${message}</p>`,
          template_code,
          payload_json,
          emailResult.id
        );
        await emailResult.update({ status: 'SENT' });
        logger.info(`Auto-triggered Email SENT for user ${recipient_user_id} via send-sms`);
      } catch (emailErr) {
        await emailResult.update({ status: 'FAILED' });
        logger.error(`Auto-triggered Email FAILED to ${req.body.recipient_email}: ${emailErr.message}`);
      }
    }

    // Create an in-app notification record if it's a templated event (THIS IS WHAT USERS SEE IN FRONTEND)
    if (template_code) {
      await service.createNotification({
        recipient_user_id,
        channel: 'in-app',
        template_code,
        message: message || `New ${template_code.replace(/_/g, ' ')} alert`,
        payload_json,
        priority,
        status: 'SENT' // In-app is "sent" immediately upon creation
      });
      logger.info(`Recorded In-App notification for user ${recipient_user_id} (@${template_code})`);
    }

    res.status(201).json(result);
  } catch (err) {
    logger.error(`Error sending SMS: ${err.message || JSON.stringify(err)}`);
    console.log('Full Error Details:', err);
    res.status(500).json({ error: err.message || err });
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
    logger.info(`Fetching notifications for user: ${userId}`);
    const result = await service.getNotificationsByUser(userId);
    logger.info(`Found ${result.length} notifications for user ${userId}`);
    res.json({ notifications: result });
  } catch (err) {
    logger.error(`Error fetching notifications for user ${req.params.userId}: ${err.message}`);
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

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.updateNotification(id, { is_read: true });
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    logger.info({ id }, 'Notification marked as read');
    res.json(result);
  } catch (err) {
    logger.error({ id: req.params.id, err }, 'Error marking notification as read');
    res.status(500).json({ error: err.message });
  }
};