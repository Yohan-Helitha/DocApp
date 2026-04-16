import { PrescriptionSnapshot } from '../models/index.js';
import axios from 'axios';

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://localhost:6002/api/v1/doctors';

export default {
    /**
     * Get prescriptions for a patient including doctor details
     * @param {number} patientId - The ID of the patient
     * @returns {Promise<Array>} List of prescriptions with doctor info
     */
    getPrescriptions: async (patientId) => {
        const prescriptions = await PrescriptionSnapshot.findAll({
            where: { patient_id: patientId },
            order: [['issued_at', 'DESC']]
        });

        // Enrich with doctor details from doctor-management-service
        const enrichedPrescriptions = await Promise.all(prescriptions.map(async (prescription) => {
            const rawPrescription = prescription.toJSON();
            try {
                // Fetch doctor details from external service
                const response = await axios.get(`${DOCTOR_SERVICE_URL}/${rawPrescription.doctor_id}`);
                rawPrescription.doctor = response.data;
            } catch (err) {
                console.warn(`Could not fetch doctor details for ID ${rawPrescription.doctor_id}:`, err.message);
                rawPrescription.doctor = { id: rawPrescription.doctor_id, name: 'Unknown Doctor' };
            }
            return rawPrescription;
        }));

        return enrichedPrescriptions;
    }
};