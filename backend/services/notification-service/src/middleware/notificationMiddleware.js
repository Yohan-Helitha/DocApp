import logger from '../config/logger.js';
import { validateNotification } from '../validation/notificationValidation.js';

/**
 * Middleware for validating incoming notification requests
 */
export const notificationValidator = (req, res, next) => {
  // Bulk requests have 'recipients' instead of 'recipient_user_id'
  if (req.path.includes('/send-bulk')) {
    const { recipients, channel, message, template_code } = req.body;
    const errors = [];
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      errors.push("recipients array is required and must not be empty");
    }
    if (!channel) errors.push("channel is required");
    if (!message && !template_code) errors.push("Either message or template_code must be provided");
    
    if (errors.length > 0) {
      logger.warn(`Invalid bulk notification request: ${errors.join(", ")}`);
      return res.status(400).json({ error: errors.join(", ") });
    }
    return next();
  }

  const error = validateNotification(req.body);
  if (error) {
    logger.warn(`Invalid notification request: ${error}`);
    return res.status(400).json({ error });
  }
  next();
};

/**
 * Identity middleware: Checks for user context passed from Gateway/Auth
 */
export const verifyIdentity = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    logger.warn('Identity verification failed: No X-User-ID header found');
    return res.status(401).json({ error: 'unauthorized_access' });
  }

  req.user = {
    id: userId,
    role: userRole || 'user'
  };

  next();
};

/**
 * Access Control Middleware: Ensures only admins can perform restricted actions
 */
export const restrictToAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logger.warn(`Access denied to non-admin user: ${req.user?.id}`);
    res.status(403).json({ error: 'admin_permissions_required' });
  }
};
