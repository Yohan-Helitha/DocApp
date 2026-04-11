import express from 'express';
import { 
    uploadReport,
    getMedicalReports,
    updateReport,
    deleteReport
} from '../controllers/reportController.js';
import internalAuthMiddleware from '../middleware/internalAuthMiddleware.js';
import { reportAuthMiddleware, verifyReportOwnership } from '../middleware/reportMiddleware.js';
import { 
    uploadReportValidator,
    getReportValidator,
    updateReportValidator,
    deleteReportValidator
} from '../validation/reportValidation.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Medical Records Routes
// POST - Upload report (patient auth + ownership verification required)
router.post('/:patientId/medical-reports', reportAuthMiddleware, verifyReportOwnership, upload.single('report_file'), uploadReportValidator, uploadReport);

// GET - Retrieve all reports for a patient (internal service auth required)
router.get('/:patientId/medical-reports', internalAuthMiddleware, getReportValidator, getMedicalReports);

// PUT - Update report notes (patient auth + ownership verification required)
router.put('/:patientId/medical-reports/:reportId', reportAuthMiddleware, verifyReportOwnership, updateReportValidator, updateReport);

// DELETE - Delete report (patient auth + ownership verification required)
router.delete('/:patientId/medical-reports/:reportId', reportAuthMiddleware, verifyReportOwnership, deleteReportValidator, deleteReport);

export default router;