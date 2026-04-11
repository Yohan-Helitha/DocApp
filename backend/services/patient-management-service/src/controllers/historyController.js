import historyService from '../services/historyService.js';

export const createHistoryEntry = async (req, res) => {
    try {
        const history = await historyService.createHistoryEntry(req.params.patientId, req.body);
        res.status(201).json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getMedicalHistory = async (req, res) => {
    try {
        const history = await historyService.getMedicalHistory(req.params.patientId);
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateHistoryEntry = async (req, res) => {
    try {
        const history = await historyService.updateHistoryEntry(req.params.historyId, req.body);
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteHistoryEntry = async (req, res) => {
    try {
        await historyService.deleteHistoryEntry(req.params.historyId);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};