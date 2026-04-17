import express from 'express';
const router = express.Router();
import * as controller from '../controllers/notificationController.js';
import { notificationValidator, verifyIdentity, restrictToAdmin } from '../middleware/notificationMiddleware.js';

// v1 routes as per SPEC
// Only authenticated services/users can send notifications
router.post('/send-email', verifyIdentity, notificationValidator, controller.sendEmail);
router.post('/send-sms', verifyIdentity, notificationValidator, controller.sendSms);
router.post('/send-bulk', verifyIdentity, restrictToAdmin, controller.sendBulk);

// Enhanced CRUD (secured with identity and access control)
// Latest notifications for the authenticated user (patient dashboard overview)
router.get('/latest', verifyIdentity, controller.getLatestNotifications);
router.get('/user/:userId', verifyIdentity, controller.getNotifications);
router.get('/:id', verifyIdentity, controller.getNotificationById);
router.patch('/:id/read', verifyIdentity, controller.markAsRead);
router.put('/:id', verifyIdentity, restrictToAdmin, controller.updateNotification);
router.delete('/:id', verifyIdentity, restrictToAdmin, controller.deleteNotification);

export default router;