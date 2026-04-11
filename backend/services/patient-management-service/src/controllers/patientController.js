import patientService from '../services/patientService.js';

export const createPatient = async (req, res) => {
    try {
        const newPatient = await patientService.createPatient(req.body, req.user);
        res.status(201).json(newPatient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getPatientById = async (req, res) => {
    try {
        const patient = await patientService.getPatientById(req.params.patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        res.status(200).json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePatient = async (req, res) => {
    try {
        const patient = await patientService.updatePatient(req.params.patientId, req.body);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        res.status(200).json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deletePatient = async (req, res) => {
    try {
        const patient = await patientService.deletePatient(req.params.patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};