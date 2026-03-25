import express from 'express';
const router = express.Router();
import * as controller from '../controllers/attemptController.js';
import { verifyIdentity } from '../middleware/notificationMiddleware.js';
import { validateAttemptRequest } from '../middleware/attemptMiddleware.js';

router.post('/', verifyIdentity, validateAttemptRequest, controller.recordAttempt);
router.get('/notification/:id', verifyIdentity, controller.getAttempts);
router.get('/:id', verifyIdentity, controller.getAttemptById);

export default router;
