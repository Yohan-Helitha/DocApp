import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const patientIdValidator = [
    param('patientId').notEmpty().withMessage('Patient ID is required').isString().withMessage('Patient ID must be a string'),
    validate
];

export const uploadReportValidator = [
    body('report_name').optional().isString(),
    body('notes').optional().isString(),
    validate
];

export const getReportValidator = [
    param('patientId').notEmpty().withMessage('Patient ID is required').isString().withMessage('Patient ID must be a string'),
    validate
];

export const updateReportValidator = [
    param('patientId').notEmpty().withMessage('Patient ID is required').isString().withMessage('Patient ID must be a string'),
    param('reportId').isInt().withMessage('Invalid report ID'),
    body('notes').optional().isString(),
    body('report_name').optional().isString(),
    body('file_type').optional().isString(),
    validate
];

export const deleteReportValidator = [
    param('patientId').notEmpty().withMessage('Patient ID is required').isString().withMessage('Patient ID must be a string'),
    param('reportId').isInt().withMessage('Invalid report ID'),
    validate
];