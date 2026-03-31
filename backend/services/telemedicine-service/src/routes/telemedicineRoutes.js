import express from 'express';
const router = express.Router();
import * as controller from '../controllers/telemedicineController.js';
import authMiddleware from '../middleware/authMiddleware.js';

// Create session - requires authentication
router.post('/api/v1/telemedicine/sessions', authMiddleware, controller.createSession);
// Get session info
router.get('/api/v1/telemedicine/sessions/:sessionId', authMiddleware, controller.getSession);
// Generate join token for a participant
router.post('/api/v1/telemedicine/sessions/:sessionId/join-token', authMiddleware, controller.createJoinToken);
// Start session
router.put('/api/v1/telemedicine/sessions/:sessionId/start', authMiddleware, controller.startSession);
// End session
router.put('/api/v1/telemedicine/sessions/:sessionId/end', authMiddleware, controller.endSession);

export default router;
