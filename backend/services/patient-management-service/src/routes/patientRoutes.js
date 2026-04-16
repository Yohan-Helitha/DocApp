import express from 'express';
import { 
    createPatient, 
    getPatientById, 
    updatePatient, 
    deletePatient
} from '../controllers/patientController.js';
import patientMiddleware from '../middleware/patientMiddleware.js';
import { 
    createPatientValidator, 
    updatePatientValidator, 
    patientIdValidator
} from '../validation/patientValidation.js';

const router = express.Router();

// Apply middleware to all patient routes
router.use(patientMiddleware);

// Patient Profile Routes
router.post('/', createPatientValidator, createPatient);
router.get('/:patientId', patientIdValidator, getPatientById);
router.put('/:patientId', updatePatientValidator, updatePatient);
router.delete('/:patientId', patientIdValidator, deletePatient);

export default router;