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

/**
 * Middleware to verify patient JWT and check report ownership
 * Validates that the patient JWT belongs to the patient in the route params
 */
const reportAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;

        // Verify patient ownership - user_id from JWT should match patient's user_id
        // This will be further verified in the controller
        next();
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Middleware to verify patient owns the medical report
 * Should be used after reportAuthMiddleware
 */
const verifyReportOwnership = async (req, res, next) => {
    try {
        const { patientId } = req.params;

        // Get patient to compare with user_id from JWT
        // Resolve UUID to internal ID if necessary
        const patient = await Patient.findOne({ where: { user_id: patientId } });
        
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Verify the user making the request is the patient
        if (patient.user_id !== req.user.sub && patient.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: You can only manage your own reports' });
        }

        // Attach patient info to request for use in controllers
        req.patient = patient;
        next();
    } catch (err) {
        console.error('Ownership Verification Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
};

export { reportAuthMiddleware, verifyReportOwnership };
