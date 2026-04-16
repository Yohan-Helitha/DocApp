const internalAuthMiddleware = (req, res, next) => {
    const internalSecret = req.headers['x-internal-secret'];

    if (!internalSecret || internalSecret !== process.env.INTERNAL_SECRET) {
        return res.status(401).json({ error: 'unauthorized' });
    }

    next();
};

export default internalAuthMiddleware;
