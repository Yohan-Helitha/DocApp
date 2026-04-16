CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_user_id VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    -- 'sms', 'email', 'in-app'
    template_code VARCHAR(50),
    message TEXT,
    payload_json JSONB,
    status VARCHAR(20) DEFAULT 'queued',
    -- 'queued', 'sent', 'delivered', 'failed'
    priority VARCHAR(10) DEFAULT 'normal',
    -- 'low', 'normal', 'high'
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS notification_attempts (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    provider VARCHAR(50),
    provider_response TEXT,
    status VARCHAR(20),
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);