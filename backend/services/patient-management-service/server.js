import 'dotenv/config';
import app from './src/app.js';
import pool from './src/config/db.js';

const PORT = process.env.PORT || 6001;

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Patient DB connection failed:', err);
    } else {
        console.log('✅ Patient DB connected! Server time:', res.rows[0].now);
        
        app.listen(PORT, () => {
            console.log(`Patient Management Service running on port ${PORT}`);
        });
    }
});
