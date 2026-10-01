BEGIN;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS from_area text,
  ADD COLUMN IF NOT EXISTS to_area text;

CREATE INDEX IF NOT EXISTS requests_from_area_idx ON requests (from_area);

COMMIT;