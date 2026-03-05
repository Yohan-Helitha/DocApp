const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validation/authValidation');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/api/v1/auth/register', validateRegister, controller.register);
router.post('/api/v1/auth/login', validateLogin, controller.login);

// Protected routes
router.get('/api/v1/auth/me', authMiddleware, controller.me);

module.exports = router;
