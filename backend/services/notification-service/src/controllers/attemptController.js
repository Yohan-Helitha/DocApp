import * as service from '../services/attemptService.js';
import logger from '../config/logger.js';

export const recordAttempt = async (req, res) => {
  try {
    const { notification_id, provider, provider_response, status } = req.body;

    if (!notification_id || !status) {
      return res.status(400).json({ error: 'notification_id and status are required' });
    }

    const result = await service.createAttempt({
      notification_id,
      provider,
      provider_response,
      status
    });

    logger.info(`Recorded attempt for notification ID: ${notification_id}`);
    res.status(201).json(result);
  } catch (err) {
    logger.error(`Error recording attempt for notification ${req.body.notification_id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getAttempts = async (req, res) => {
  try {
    const { id } = req.params; // notification ID
    const result = await service.getAttemptsByNotification(id);
    res.json(result);
  } catch (err) {
    logger.error(`Error fetching attempts for notification ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.getAttemptById(id);
    if (!result) return res.status(404).json({ error: 'Attempt not found' });
    res.json(result);
  } catch (err) {
    logger.error(`Error fetching attempt ${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
};
