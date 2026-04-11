import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Custom validator to ensure date is not in the future
export const notFutureDate = body('diagnosed_on')
    .isDate()
    .withMessage('Invalid date format')
    .custom(value => {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate > today) {
            throw new Error('Diagnosed on date cannot be in the future');
        }
        return true;
    });

export const patientIdValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    validate
];

export const historyIdValidator = [
    param('historyId').isInt().withMessage('Invalid history ID'),
    validate
];

export const createHistoryValidator = [
    body('condition_name').notEmpty().withMessage('Condition name is required'),
    notFutureDate.optional(),
    body('status').optional().isIn(['active', 'resolved', 'chronic', 'under_treatment', 'inactive']).withMessage('Status must be one of: active, resolved, chronic, under_treatment, inactive'),
    body('remarks').optional().isString(),
    validate
];

export const updateHistoryValidator = [
    body('condition_name').optional().isString(),
    notFutureDate.optional(),
    body('status').optional().isIn(['active', 'resolved', 'chronic', 'under_treatment', 'inactive']),
    body('remarks').optional().isString(),
    validate
];