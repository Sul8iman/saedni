-- Migration 008: durable claim and delivery marker for the first helper welcome
-- template. The timestamp is written only after Meta accepts the request.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS helper_welcome_message_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS helper_welcome_message_lease_id text,
  ADD COLUMN IF NOT EXISTS helper_welcome_message_lease_expires_at timestamptz;