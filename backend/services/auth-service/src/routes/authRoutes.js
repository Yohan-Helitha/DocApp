import express from 'express';
const router = express.Router();
import * as controller from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../validation/authValidation.js';
import authMiddleware from '../middleware/authMiddleware.js';

// Public routes
router.post('/api/v1/auth/register', validateRegister, controller.register);
router.post('/api/v1/auth/register/patient', validateRegister, (req, res) => controller.registerRole(req, res, 'patient'));
router.post('/api/v1/auth/register/doctor', validateRegister, (req, res) => controller.registerRole(req, res, 'doctor'));
router.post('/api/v1/auth/register/admin', validateRegister, (req, res) => controller.registerRole(req, res, 'admin'));
router.post('/api/v1/auth/login', validateLogin, controller.login);
router.post('/api/v1/auth/refresh-token', controller.refreshToken);
router.post('/api/v1/auth/logout', controller.logout);
router.get('/api/v1/auth/verify-token', controller.verifyToken);

// Protected routes
router.get('/api/v1/auth/me', authMiddleware, controller.me);

export default router;
