import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { Patient } from '../models/index.js';

let cachedPublicKey = null;

const getPublicKey = () => {
    if (cachedPublicKey) return cachedPublicKey;

    const configuredPath = process.env.AUTH_PUBLIC_KEY_PATH;
    if (!configuredPath) return null;

    const absPath = path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(process.cwd(), configuredPath);

    if (!fs.existsSync(absPath)) return null;

    cachedPublicKey = fs.readFileSync(absPath, 'utf8');
    return cachedPublicKey;
};

const verifyAccessToken = (token) => {
    const publicKey = getPublicKey();
    if (publicKey) {
        try {
            return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        } catch {
            // Fall back to HS256 verification below.
        }
    }

    return jwt.verify(token, process.env.JWT_SECRET);
};

const historyMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required for history access' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;

        // If a patientId is in the URL, verify the user owns this record or is an admin/doctor
        const { patientId } = req.params;
        if (patientId) {
            // Resolve UUID to internal ID if necessary
            const patient = await Patient.findOne({ where: { user_id: patientId } });
            
            if (!patient) {
                return res.status(404).json({ message: 'Patient not found' });
            }

            // Authorization: User can only see their own history, unless they are admin/doctor
            const isOwner = patient.user_id === decoded.id || patient.user_id === decoded.sub;
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