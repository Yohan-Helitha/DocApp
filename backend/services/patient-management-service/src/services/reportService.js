import { MedicalReport } from '../models/index.js';

export default {
    /**
     * Upload a new medical report
     * @param {number} patientId - The ID of the patient
     * @param {Object} reportData - The report data
     * @returns {Promise<Object>} The created report
     */
    uploadReport: async (patientId, reportData) => {
        return await MedicalReport.create({ 
            ...reportData, 
            patient_id: patientId 
        });
    },

    /**
     * Get all medical reports for a patient
     * @param {number} patientId - The ID of the patient
     * @returns {Promise<Array>} Array of medical reports
     */
    getMedicalReportsByPatientId: async (patientId) => {
        return await MedicalReport.findAll({ where: { patient_id: patientId } });
    },

    /**
     * Update a medical report (update notes)
     * @param {number} reportId - The ID of the report
     * @param {number} patientId - The ID of the patient (for ownership verification)
     * @param {Object} updateData - The data to update
     * @returns {Promise<Object>} The updated report
     */
    updateReport: async (reportId, patientId, updateData) => {
        const report = await MedicalReport.findByPk(reportId);
        if (!report) return null;
        if (report.patient_id !== parseInt(patientId)) {
            throw new Error('Unauthorized: Report does not belong to this patient');
        }
        return await report.update(updateData);
    },

    /**
     * Delete a medical report
     * @param {number} reportId - The ID of the report
     * @param {number} patientId - The ID of the patient (for ownership verification)
     * @returns {Promise<Boolean>} True if deleted successfully
     */
    deleteReport: async (reportId, patientId) => {
        const report = await MedicalReport.findByPk(reportId);
        if (!report) return null;
        if (report.patient_id !== parseInt(patientId)) {
            throw new Error('Unauthorized: Report does not belong to this patient');
        }
        await report.destroy();
        return true;
    }
};