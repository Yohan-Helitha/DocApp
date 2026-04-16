import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

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

const prescriptionMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required for prescription access' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Prescription Middleware JWT Error:', err.message);
        return res.status(403).json({ message: 'Invalid or expired prescription access token' });
    }
};

export default prescriptionMiddleware;