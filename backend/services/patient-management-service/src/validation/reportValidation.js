import { body, param, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const patientIdValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    validate
];

export const uploadReportValidator = [
    body('report_name').optional().isString(),
    body('notes').optional().isString(),
    validate
];

export const getReportValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    validate
];

export const updateReportValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    param('reportId').isInt().withMessage('Invalid report ID'),
    body('notes').optional().isString(),
    validate
];

export const deleteReportValidator = [
    param('patientId').isInt().withMessage('Invalid patient ID'),
    param('reportId').isInt().withMessage('Invalid report ID'),
    validate
];