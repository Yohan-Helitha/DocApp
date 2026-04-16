import axios from 'axios';
import { Patient } from '../models/index.js';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

export default {
    createPatient: async (patientData, user = { id: 'system-patient-service', role: 'admin' }) => {
        try {
            // Check for duplicate email across different User IDs
            const existingWithEmail = await Patient.findOne({ where: { email: patientData.email } });
            if (existingWithEmail) {
                if (existingWithEmail.user_id !== patientData.user_id) {
                    const error = new Error('This email is already registered to another patient account.');
                    error.status = 409;
                    throw error;
                }
                // If it's the same user_id, it's safe to proceed (or we could return the existing one)
            }

            const newPatient = await Patient.create(patientData);

            // Send Welcome Notification (Email + SMS + In-App)
            try {
                const { user_id, first_name, last_name, email, phone } = patientData;
                const name = `${first_name} ${last_name}`;
                
                if (NOTIFICATION_SERVICE_URL) {
                    await axios.post(`${NOTIFICATION_SERVICE_URL}/send-email`, {
                        recipient_user_id: user_id || 1, 
                        recipient_email: email,
                        recipient_phone: phone, // This triggers SMS automatically in notification-service
                        channel: 'email', // Explicitly required by notification service validation
                        template_code: 'WELCOME_USER',
                        payload_json: { 
                            name: name,
                            role: 'Patient'
                        },
                        priority: 'high'
                    }, {
                        headers: { 
                            'x-user-id': user?.sub || user?.id || 'system-patient-service', 
                            'x-user-role': user?.role || 'admin' 
                        }
                    });
                    console.log(`Integrated Welcome Notifications triggered for ${email} and ${phone}`);
                }
            } catch (notifErr) {
                console.error('⚠️ Welcome Notification failed:', notifErr.message);
            }

            return newPatient;
        } catch (dbErr) {
            console.error('❌ Database Creation Error:', dbErr);
            throw dbErr;
        }
    },

    getPatientById: async (patientId) => {
        return await Patient.findOne({ where: { user_id: patientId } });
    },
        updatePatient: async (patientId, updateData) => {
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) return null;
        return await patient.update(updateData);
    },

    deletePatient: async (patientId) => {
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        if (!patient) return null;
        await patient.destroy();
        return patient;
    }
};