import { MedicalReport, Patient } from '../models/index.js';

export default {
    /**
     * Upload a new medical report
     * @param {string} patientId - The UUID of the patient
     * @param {Object} reportData - The report data
     * @returns {Promise<Object>} The created report
     */
    uploadReport: async (patientId, reportData) => {
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) throw new Error('Patient not found');

        return await MedicalReport.create({ 
            ...reportData, 
            patient_id: patient.id 
        });
    },

    /**
     * Get all medical reports for a patient
     * @param {string} patientId - The UUID of the patient
     * @returns {Promise<Array>} Array of medical reports
     */
    getMedicalReportsByPatientId: async (patientId) => {
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) throw new Error('Patient not found');

        return await MedicalReport.findAll({ 
            where: { patient_id: patient.id },
            order: [['uploaded_at', 'ASC']],
            include: [
                {
                    model: Patient,
                    as: 'uploader',
                    attributes: ['first_name', 'last_name']
                }
            ]
        });
    },

    /**
     * Update a medical report (update notes)
     * @param {number} reportId - The ID of the report
     * @param {string} patientId - The UUID of the patient
     * @param {Object} updateData - The data to update
     * @returns {Promise<Object>} The updated report
     */
    updateReport: async (reportId, patientId, updateData) => {
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) throw new Error('Patient not found');

        const report = await MedicalReport.findByPk(reportId);
        if (!report) return null;
        if (report.patient_id !== patient.id) {
            throw new Error('Unauthorized: Report does not belong to this patient');
        }
        return await report.update(updateData);
    },

    /**
     * Delete a medical report
     * @param {number} reportId - The ID of the report
     * @param {string} patientId - The UUID of the patient
     * @returns {Promise<Boolean>} True if deleted successfully
     */
    deleteReport: async (reportId, patientId) => {
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) throw new Error('Patient not found');

        const report = await MedicalReport.findByPk(reportId);
        if (!report) return null;
        if (report.patient_id !== patient.id) {
            throw new Error('Unauthorized: Report does not belong to this patient');
        }
        await report.destroy();
        return true;
    }
};