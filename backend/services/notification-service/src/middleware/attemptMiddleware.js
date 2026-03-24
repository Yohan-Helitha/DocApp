import logger from '../config/logger.js';
import { validateAttempt } from '../validation/attemptValidation.js';

/**
 * Middleware for validating notification attempt records
 */
export const validateAttemptRequest = (req, res, next) => {
  const error = validateAttempt(req.body);
  if (error) {
    logger.warn(`Invalid attempt request: ${error}`);
    return res.status(400).json({ error });
  }
  next();
};

/**
 * Session verification middleware for attempts
 */
export const verifyAttemptAccess = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized_access' });
  }
  next();
};
