import express from 'express';
import * as controller from '../controllers/adminController.js';
import authAdminRs256 from '../middleware/authAdminRs256.js';
import internalAuthMiddleware from '../middleware/internalAuthMiddleware.js';

const router = express.Router();

// Internal (service-to-service)
router.post('/api/v1/internal/admin/audit-logs', internalAuthMiddleware, controller.createAuditLog);
router.post('/api/v1/internal/admin/transactions/upsert', internalAuthMiddleware, controller.upsertTransaction);

// User management
router.get('/api/v1/admin/users', authAdminRs256, controller.listUsers);
router.put('/api/v1/admin/users/:userId/status', authAdminRs256, controller.updateUserStatus);

// Doctor verification
router.get('/api/v1/admin/doctors/pending-verification', authAdminRs256, controller.listPendingDoctors);
router.get('/api/v1/admin/doctors/:doctorId/license', authAdminRs256, controller.viewDoctorLicense);
router.put('/api/v1/admin/doctors/:doctorId/verify', authAdminRs256, controller.verifyDoctor);

// Financial monitoring
router.get('/api/v1/admin/transactions', authAdminRs256, controller.listTransactions);

// Audit and dashboard
router.get('/api/v1/admin/audit-logs', authAdminRs256, controller.listAuditLogs);
router.get('/api/v1/admin/dashboard/metrics', authAdminRs256, controller.getDashboardMetrics);

export default router;
