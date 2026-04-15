import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const createPatientValidator = [
    body('user_id').notEmpty().withMessage('User ID is required').isString().withMessage('User ID must be a string'),
    body('first_name').notEmpty().withMessage('First name is required').trim(),
    body('last_name').notEmpty().withMessage('Last name is required').trim(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').matches(/^\+94\d{9}$/).withMessage('Phone number must be in format +94XXXXXXXXX'),
    body('dob').isDate().withMessage('Date of birth must be a valid date'),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('address').notEmpty().withMessage('Address is required').trim(),
    body('blood_group').notEmpty().withMessage('Blood group is required').isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).withMessage('Invalid blood group'),
    body('allergies').notEmpty().withMessage('Allergies information is required (put "None" if none)'),
    body('emergency_contact_name').notEmpty().withMessage('Emergency contact name is required'),
    body('emergency_contact_phone').matches(/^\+94\d{9}$/).withMessage('Emergency contact phone must be in format +94XXXXXXXXX'),
    body('profile_image').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
    validate
];

export const updatePatientValidator = [
    param('patientId').notEmpty().withMessage('Patient ID is required'),
    body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
    body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().matches(/^\+94\d{9}$/).withMessage('Phone format: +94XXXXXXXXX'),
    body('dob').optional().isDate().withMessage('Invalid DOB'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('blood_group').optional().isIn(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).withMessage('Invalid blood group'),
    body('emergency_contact_name').optional().notEmpty(),
    body('emergency_contact_phone').optional().matches(/^\+94\d{9}$/).withMessage('Phone format: +94XXXXXXXXX'),
    validate
];

export const patientIdValidator = [
    param('patientId').notEmpty().withMessage('Patient ID is required').isString().withMessage('Patient ID must be a string'),
    validate
];