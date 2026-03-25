-- Telemedicine DB initialization
CREATE TABLE IF NOT EXISTS telemedicine_sessions (
  session_id uuid PRIMARY KEY,
  appointment_id uuid,
  provider text,
  external_room_id text,
  session_status text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_participants (
  participant_id uuid PRIMARY KEY,
  session_id uuid REFERENCES telemedicine_sessions(session_id),
  user_id uuid,
  participant_role text,
  join_time timestamptz,
  leave_time timestamptz
);
