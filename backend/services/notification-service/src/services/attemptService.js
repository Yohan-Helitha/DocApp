import db from '../config/db.js';

export const createAttempt = async (data) => {
  const { notification_id, provider, provider_response, status } = data;
  const result = await db.query(
    'INSERT INTO notification_attempts(notification_id, provider, provider_response, status) VALUES($1::int, $2::text, $3::jsonb, $4::text) RETURNING *',
    [Number(notification_id), provider, JSON.stringify(provider_response), status]
  );

  // Automatically update the main notification status based on attempt result
  let finalStatus = 'queued';
  if (status === 'sent' || status === 'delivered') finalStatus = status;
  if (status === 'failed') finalStatus = 'failed';

  await db.query(
    'UPDATE notifications SET status = $1::text, sent_at = CASE WHEN $1::text IN (\'sent\', \'delivered\') THEN CURRENT_TIMESTAMP ELSE sent_at END, updated_at = CURRENT_TIMESTAMP WHERE id = $2::int',
    [finalStatus, Number(notification_id)]
  );

  return result.rows[0];
};

export const getAttemptsByNotification = async (notificationId) => {
  const result = await db.query(
    'SELECT * FROM notification_attempts WHERE notification_id = $1 ORDER BY attempted_at DESC',
    [notificationId]
  );
  return result.rows;
};

export const getAttemptById = async (id) => {
  const result = await db.query('SELECT * FROM notification_attempts WHERE id = $1', [id]);
  return result.rows[0];
};
