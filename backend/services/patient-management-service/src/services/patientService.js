import axios from 'axios';
import { Patient } from '../models/index.js';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

export default {
    createPatient: async (patientData, user = { id: 'system-patient-service', role: 'admin' }) => {
        const newPatient = await Patient.create(patientData);

        // Send Welcome Notification
        try {
            const { user_id, full_name, email, phone } = patientData;
            
            // Send Email
            await axios.post(`${NOTIFICATION_SERVICE_URL}/send-email`, {
                recipient_user_id: user_id || 1, 
                channel: 'email',             
                message: `Welcome to DocApp, ${full_name}! Your profile has been created successfully.`, 
                recipient_email: email,
                subject: 'Welcome to DocApp!'
            }, {
                headers: { 'x-user-id': user?.id, 'x-user-role': user?.role }
            });

            // Send SMS
            await axios.post(`${NOTIFICATION_SERVICE_URL}/send-sms`, {
                recipient_user_id: user_id || 1, 
                channel: 'sms',             
                message: `Hi ${full_name}, welcome to DocApp! Your account is ready.`, 
                recipient_phone: phone
            }, {
                headers: { 'x-user-id': user?.id, 'x-user-role': user?.role }
            });

        } catch (notifErr) {
            console.error('⚠️ Failed to send notification in Service:', notifErr.message);
        }

        return newPatient;
    },

    getPatientById: async (patientId) => {
        return await Patient.findByPk(patientId);
    },

    updatePatient: async (patientId, updateData) => {
        const patient = await Patient.findByPk(patientId);
        if (!patient) return null;
        return await patient.update(updateData);
    },

    deletePatient: async (patientId) => {
        const patient = await Patient.findByPk(patientId);
        if (!patient) return null;
        await patient.destroy();
        return patient;
    }
};