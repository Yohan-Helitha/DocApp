const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validation/authValidation');
const authMiddleware = require('../middleware/authMiddleware');

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

module.exports = router;
