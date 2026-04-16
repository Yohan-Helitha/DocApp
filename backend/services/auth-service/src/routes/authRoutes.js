import express from 'express';
const router = express.Router();
import * as controller from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../validation/authValidation.js';
import authMiddleware from '../middleware/authMiddleware.js';
import internalAuthMiddleware from '../middleware/internalAuthMiddleware.js';
import multer from 'multer';

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Public routes
router.post('/api/v1/auth/register', validateRegister, controller.register);
router.post('/api/v1/auth/register/patient', validateRegister, (req, res) => controller.registerRole(req, res, 'patient'));
// Doctor registration requires an uploaded license document via multipart/form-data
// Field name: license
router.post(
	'/api/v1/auth/register/doctor',
	upload.single('license'),
	validateRegister,
	controller.registerDoctor,
);
router.post('/api/v1/auth/register/admin', validateRegister, (req, res) => controller.registerRole(req, res, 'admin'));
router.post('/api/v1/auth/login', validateLogin, controller.login);
router.post('/api/v1/auth/refresh-token', controller.refreshToken);
router.post('/api/v1/auth/logout', controller.logout);
router.get('/api/v1/auth/verify-token', controller.verifyToken);

// Protected routes
router.get('/api/v1/auth/me', authMiddleware, controller.me);

// Admin-only doctor verification workflow
router.get(
	'/api/v1/auth/admin/doctors/pending-verification',
	authMiddleware,
	controller.listPendingDoctorVerifications,
);
router.get(
	'/api/v1/auth/admin/doctors/:userId/license',
	authMiddleware,
	controller.downloadDoctorLicense,
);
router.put(
	'/api/v1/auth/admin/doctors/:userId/verify',
	authMiddleware,
	controller.verifyDoctor,
);

// Internal (service-to-service) doctor verification workflow
router.get(
	'/api/v1/internal/auth/doctors/verification-records',
	internalAuthMiddleware,
	controller.internalListDoctorVerifications,
);
router.get(
	'/api/v1/internal/auth/doctors/pending-verification',
	internalAuthMiddleware,
	controller.internalListPendingDoctorVerifications,
);
router.get(
	'/api/v1/internal/auth/doctors/:userId/license',
	internalAuthMiddleware,
	controller.internalDownloadDoctorLicense,
);
router.put(
	'/api/v1/internal/auth/doctors/:userId/verify',
	internalAuthMiddleware,
	controller.internalVerifyDoctor,
);

export default router;
