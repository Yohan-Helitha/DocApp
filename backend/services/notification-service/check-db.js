
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDb() {
  try {
    console.log('--- Notifications Table (Last 3) ---');
    const notes = await db.query('SELECT id, recipient_user_id, channel, status FROM notifications ORDER BY id DESC LIMIT 3');
    console.table(notes.rows);

    console.log('\n--- Notification Attempts Table (Last 3) ---');
    const attempts = await db.query('SELECT * FROM notification_attempts ORDER BY id DESC LIMIT 3');
    console.table(attempts.rows);
  } catch (err) {
    console.error('Database query error:', err.message);
  } finally {
    process.exit();
  }
}

checkDb();
