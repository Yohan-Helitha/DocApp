import { MedicalHistoryEntry, Patient } from '../models/index.js';

export default {
    /**
     * Create a new medical history entry
     * @param {string} patientId - The UUID of the patient (user_id)
     * @param {Object} historyData - The history data
     * @returns {Promise<Object>} The created history entry
     */
    createHistoryEntry: async (patientId, historyData) => {
        // Resolve UUID to integer ID
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) throw new Error('Patient record not found');

        return await MedicalHistoryEntry.create({ 
            ...historyData, 
            patient_id: patient.id 
        });
    },

    /**
     * Get all medical history entries for a patient
     * @param {string} patientId - The UUID of the patient (user_id)
     * @returns {Promise<Array>} List of medical history entries
     */
    getMedicalHistory: async (patientId) => {
        // Resolve UUID to integer ID
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) throw new Error('Patient record not found');

        return await MedicalHistoryEntry.findAll({
            where: { patient_id: patient.id },
            order: [['diagnosed_on', 'DESC']]
        });
    },

    /**
     * Update a medical history entry
     * @param {number} historyId - The ID of the history entry
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} The updated entry
     */
    updateHistoryEntry: async (historyId, updateData) => {
        const entry = await MedicalHistoryEntry.findByPk(historyId);
        if (!entry) throw new Error('History entry not found');
        return await entry.update(updateData);
    },

    /**
     * Delete a medical history entry
     * @param {number} historyId - The ID of the history entry
     */
    deleteHistoryEntry: async (historyId) => {
        const entry = await MedicalHistoryEntry.findByPk(historyId);
        if (!entry) throw new Error('History entry not found');
        return await entry.destroy();
    }
};