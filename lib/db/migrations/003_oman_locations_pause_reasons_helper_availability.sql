BEGIN;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS from_governorate text,
  ADD COLUMN IF NOT EXISTS to_governorate text,
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS help_not_completed_reason text,
  ADD COLUMN IF NOT EXISTS help_not_completed_comment text;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_helper_available boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS requests_available_unpaused_idx
  ON requests (status, is_paused, created_at);

COMMIT;
