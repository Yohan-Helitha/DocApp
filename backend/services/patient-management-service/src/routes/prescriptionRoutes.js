import express from 'express';
import { 
    getPrescriptions 
} from '../controllers/prescriptionController.js';
import prescriptionMiddleware from '../middleware/prescriptionMiddleware.js';
import { 
    patientIdValidator 
} from '../validation/prescriptionValidation.js';

const router = express.Router();

// Apply middleware
router.use(prescriptionMiddleware);

// Prescription Routes
router.get('/:patientId/prescriptions', patientIdValidator, getPrescriptions);

export default router;