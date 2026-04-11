import jwt from 'jsonwebtoken';
import { Patient } from '../models/index.js';

const historyMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required for history access' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '8f3d2c1b9e7a6c5b4d3f2a1e0b9c8d7f6a5e4d3c2b1a0f9e8d7c6b5a4e3f2d1');
        req.user = decoded;

        // If a patientId is in the URL, verify the user owns this record or is an admin/doctor
        const { patientId } = req.params;
        if (patientId) {
            const patient = await Patient.findByPk(patientId);
            if (!patient) {
                return res.status(404).json({ message: 'Patient not found' });
            }

            // Authorization: User can only see their own history, unless they are admin/doctor
            const isOwner = patient.user_id === decoded.id;
            const isAuthorizedRole = ['admin', 'doctor'].includes(decoded.role);

            if (!isOwner && !isAuthorizedRole) {
                return res.status(403).json({ message: 'You are not authorized to access this patient\'s history' });
            }
        }
        
        next();
    } catch (err) {
        console.error('History Middleware JWT Error:', err.message);
        return res.status(403).json({ message: 'Invalid or expired history access token' });
    }
};

export default historyMiddleware;