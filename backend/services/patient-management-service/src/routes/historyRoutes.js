import express from 'express';
import { 
    getMedicalHistory,
    createHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry
} from '../controllers/historyController.js';
import historyMiddleware from '../middleware/historyMiddleware.js';
import { 
    patientIdValidator,
    historyIdValidator,
    createHistoryValidator,
    updateHistoryValidator
} from '../validation/historyValidation.js';

const router = express.Router();

// Apply middleware
router.use(historyMiddleware);

// Medical Records Routes
router.get('/:patientId/medical-history', patientIdValidator, getMedicalHistory);
router.post('/:patientId/medical-history', patientIdValidator, createHistoryValidator, createHistoryEntry);
router.put('/:historyId/medical-history-entry', historyIdValidator, updateHistoryValidator, updateHistoryEntry);
router.delete('/:historyId/medical-history-entry', historyIdValidator, deleteHistoryEntry);

export default router;