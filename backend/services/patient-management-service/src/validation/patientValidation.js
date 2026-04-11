import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const createPatientValidator = [
    body('user_id').isInt().withMessage('User ID must be an integer'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('dob').isDate().withMessage('Date of birth must be a valid date'),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('address').notEmpty().withMessage('Address is required'),
    body('blood_group').optional().isString().isLength({ max: 10 }),
    body('allergies').optional().isString(),
    body('profile_image').optional().isString(),
    body('is_active').optional().isBoolean(),
    validate
];

export const updatePatientValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
    body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
    body('dob').optional().isDate().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('blood_group').optional().isString().isLength({ max: 10 }),
    body('allergies').optional().isString(),
    body('profile_image').optional().isString(),
    body('is_active').optional().isBoolean(),
    validate
];

export const patientIdValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    validate
];