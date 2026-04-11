import { MedicalHistoryEntry } from '../models/index.js';

export default {
    /**
     * Create a new medical history entry
     * @param {number} patientId - The ID of the patient
     * @param {Object} historyData - The history data
     * @returns {Promise<Object>} The created history entry
     */
    createHistoryEntry: async (patientId, historyData) => {
        return await MedicalHistoryEntry.create({ 
            ...historyData, 
            patient_id: patientId 
        });
    },

    /**
     * Get all medical history entries for a patient
     * @param {number} patientId - The ID of the patient
     * @returns {Promise<Array>} List of medical history entries
     */
    getMedicalHistory: async (patientId) => {
        return await MedicalHistoryEntry.findAll({
            where: { patient_id: patientId },
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