import express from 'express';
import * as controller from '../controllers/adminController.js';

const router = express.Router();

// User management
router.get('/api/v1/admin/users', controller.listUsers);
router.put('/api/v1/admin/users/:userId/status', controller.updateUserStatus);

// Doctor verification
router.get('/api/v1/admin/doctors/pending-verification', controller.listPendingDoctors);
router.put('/api/v1/admin/doctors/:doctorId/verify', controller.verifyDoctor);

// Financial monitoring
router.get('/api/v1/admin/transactions', controller.listTransactions);

// Audit and dashboard
router.get('/api/v1/admin/audit-logs', controller.listAuditLogs);
router.get('/api/v1/admin/dashboard/metrics', controller.getDashboardMetrics);

export default router;
