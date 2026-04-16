import jwt from 'jsonwebtoken';
import 'dotenv/config';

const payload = {
    id: 999,
    email: 'test-admin@docapp.com',
    role: 'admin'
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log('--- TEST TOKEN GENERATED ---');
console.log('Use this token in your Authorization header as Bearer token:');
console.log(token);
console.log('-----------------------------');