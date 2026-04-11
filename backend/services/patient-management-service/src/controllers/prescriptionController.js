import prescriptionService from '../services/prescriptionService.js';

export const getPrescriptions = async (req, res) => {
    try {
        const prescriptions = await prescriptionService.getPrescriptions(req.params.patientId);
        res.status(200).json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};