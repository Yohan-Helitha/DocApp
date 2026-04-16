import jwt from 'jsonwebtoken';

const prescriptionMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required for prescription access' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Prescription Middleware JWT Error:', err.message);
        return res.status(403).json({ message: 'Invalid or expired prescription access token' });
    }
};

export default prescriptionMiddleware;