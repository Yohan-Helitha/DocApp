import 'dotenv/config';
import pool from './src/config/db.js';

async function testConnection() {
  try {
    console.log('--- Database Connection Test ---');
    console.log(`Attempting to connect to: ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);
    console.log(`User: ${process.env.PGUSER}`);
    
    const client = await pool.connect();
    console.log('✅ SUCCESS: Connected to PostgreSQL database!');
    
    const res = await client.query('SELECT current_database(), now()');
    console.log(`Connected to: ${res.rows[0].current_database}`);
    console.log(`Server time: ${res.rows[0].now}`);
    
    // Check if our tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('notifications', 'notification_attempts')
    `);
    
    if (tableCheck.rows.length === 0) {
      console.warn('⚠️ WARNING: Connection successful, but the tables "notifications" or "notification_attempts" were not found. Did you run your init.sql?');
    } else {
      console.log('✅ Tables found:', tableCheck.rows.map(r => r.table_name).join(', '));
    }

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR: Could not connect to the database!');
    console.error('Reason:', err.message);
    console.log('\n--- Troubleshooting Tips ---');
    console.log('1. Ensure PostgreSQL is running.');
    console.log('2. Check your .env file values (host, port, user, password, db).');
    console.log('3. Ensure the database "docapp" actually exists in pgAdmin.');
    console.log('4. Check if pgAdmin is listening on port 5432 (default).');
    process.exit(1);
  }
}

testConnection();
