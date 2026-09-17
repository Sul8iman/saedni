BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('requests', 'request_contacts', 'helper_ratings')
      AND column_name IN (
        'customer_name_snapshot',
        'customer_phone_snapshot',
        'completed_helper_name_snapshot',
        'completed_helper_phone_snapshot',
        'helper_name_snapshot'
      )
      AND data_type <> 'text'
  ) THEN
    RAISE EXCEPTION 'snapshot columns have unexpected types; rollback stopped';
  END IF;

  IF EXISTS (SELECT 1 FROM request_contacts WHERE helper_id IS NULL OR customer_id IS NULL)
     OR EXISTS (SELECT 1 FROM helper_ratings WHERE helper_id IS NULL OR customer_id IS NULL) THEN
    RAISE EXCEPTION 'rollback would require restoring deleted user references; rollback stopped';
  END IF;

  IF EXISTS (
    SELECT 1 FROM requests
    WHERE customer_name_snapshot IS NOT NULL
       OR customer_phone_snapshot IS NOT NULL
       OR completed_helper_name_snapshot IS NOT NULL
       OR completed_helper_phone_snapshot IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM request_contacts
    WHERE helper_name_snapshot IS NOT NULL
       OR customer_name_snapshot IS NOT NULL
       OR customer_phone_snapshot IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM helper_ratings
    WHERE helper_name_snapshot IS NOT NULL
       OR customer_name_snapshot IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'rollback would discard historical identity snapshots; rollback stopped';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name IN (
        'request_contacts_helper_id_fkey',
        'request_contacts_customer_id_fkey',
        'helper_ratings_helper_id_fkey',
        'helper_ratings_customer_id_fkey',
        'requests_completed_helper_id_fkey'
      )
      AND delete_rule <> 'SET NULL'
  ) THEN
    RAISE EXCEPTION 'rollback expected ON DELETE SET NULL constraints; rollback stopped';
  END IF;
END
$$;

ALTER TABLE request_contacts
  DROP CONSTRAINT request_contacts_helper_id_fkey,
  ADD CONSTRAINT request_contacts_helper_id_fkey
    FOREIGN KEY (helper_id) REFERENCES users(id) ON DELETE RESTRICT,
  DROP CONSTRAINT request_contacts_customer_id_fkey,
  ADD CONSTRAINT request_contacts_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
  ALTER COLUMN helper_id SET NOT NULL,
  ALTER COLUMN customer_id SET NOT NULL;

ALTER TABLE helper_ratings
  DROP CONSTRAINT helper_ratings_helper_id_fkey,
  ADD CONSTRAINT helper_ratings_helper_id_fkey
    FOREIGN KEY (helper_id) REFERENCES users(id) ON DELETE RESTRICT,
  DROP CONSTRAINT helper_ratings_customer_id_fkey,
  ADD CONSTRAINT helper_ratings_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
  ALTER COLUMN helper_id SET NOT NULL,
  ALTER COLUMN customer_id SET NOT NULL;

ALTER TABLE requests
  DROP CONSTRAINT requests_completed_helper_id_fkey,
  ADD CONSTRAINT requests_completed_helper_id_fkey
    FOREIGN KEY (completed_helper_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE requests
  DROP COLUMN customer_name_snapshot,
  DROP COLUMN customer_phone_snapshot,
  DROP COLUMN completed_helper_name_snapshot,
  DROP COLUMN completed_helper_phone_snapshot;

ALTER TABLE request_contacts
  DROP COLUMN helper_name_snapshot,
  DROP COLUMN customer_name_snapshot,
  DROP COLUMN customer_phone_snapshot;

ALTER TABLE helper_ratings
  DROP COLUMN helper_name_snapshot,
  DROP COLUMN customer_name_snapshot;

COMMIT;