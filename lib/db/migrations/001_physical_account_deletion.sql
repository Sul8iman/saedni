BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL
     OR to_regclass('public.requests') IS NULL
     OR to_regclass('public.request_contacts') IS NULL
     OR to_regclass('public.helper_ratings') IS NULL THEN
    RAISE EXCEPTION 'physical account deletion migration requires users, requests, request_contacts, and helper_ratings';
  END IF;

  IF EXISTS (
    WITH expected(table_schema, table_name, column_name, constraint_name, delete_rule) AS (
      VALUES
        ('public', 'helper_ratings', 'customer_id', 'helper_ratings_customer_id_fkey', 'RESTRICT'),
        ('public', 'helper_ratings', 'helper_id', 'helper_ratings_helper_id_fkey', 'RESTRICT'),
        ('public', 'request_contacts', 'customer_id', 'request_contacts_customer_id_fkey', 'RESTRICT'),
        ('public', 'request_contacts', 'helper_id', 'request_contacts_helper_id_fkey', 'RESTRICT'),
        ('public', 'requests', 'completed_helper_id', 'requests_completed_helper_id_fkey', 'RESTRICT')
    ),
    actual AS (
      SELECT tc.table_schema, tc.table_name, kcu.column_name,
             tc.constraint_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
       AND tc.constraint_name = kcu.constraint_name
       AND tc.table_name = kcu.table_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_schema = rc.constraint_schema
       AND tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_schema = ccu.constraint_schema
       AND rc.unique_constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
    )
    SELECT * FROM actual
    EXCEPT
    SELECT * FROM expected
  ) OR EXISTS (
    WITH expected(table_schema, table_name, column_name, constraint_name, delete_rule) AS (
      VALUES
        ('public', 'helper_ratings', 'customer_id', 'helper_ratings_customer_id_fkey', 'RESTRICT'),
        ('public', 'helper_ratings', 'helper_id', 'helper_ratings_helper_id_fkey', 'RESTRICT'),
        ('public', 'request_contacts', 'customer_id', 'request_contacts_customer_id_fkey', 'RESTRICT'),
        ('public', 'request_contacts', 'helper_id', 'request_contacts_helper_id_fkey', 'RESTRICT'),
        ('public', 'requests', 'completed_helper_id', 'requests_completed_helper_id_fkey', 'RESTRICT')
    ),
    actual AS (
      SELECT tc.table_schema, tc.table_name, kcu.column_name,
             tc.constraint_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
       AND tc.constraint_name = kcu.constraint_name
       AND tc.table_name = kcu.table_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_schema = rc.constraint_schema
       AND tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_schema = ccu.constraint_schema
       AND rc.unique_constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'users'
        AND ccu.column_name = 'id'
    )
    SELECT * FROM expected
    EXCEPT
    SELECT * FROM actual
  ) THEN
    RAISE EXCEPTION 'unexpected users.id foreign-key inventory; review before applying physical account deletion migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('request_contacts', 'helper_id', 'NO'),
      ('request_contacts', 'customer_id', 'NO'),
      ('helper_ratings', 'helper_id', 'NO'),
      ('helper_ratings', 'customer_id', 'NO'),
      ('requests', 'completed_helper_id', 'YES')
    ) AS expected(table_name, column_name, is_nullable)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = expected.table_name
        AND c.column_name = expected.column_name
        AND c.is_nullable = expected.is_nullable
    )
  ) THEN
    RAISE EXCEPTION 'unexpected users reference nullability; review before applying physical account deletion migration';
  END IF;
END
$$;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS customer_name_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_phone_snapshot text,
  ADD COLUMN IF NOT EXISTS completed_helper_name_snapshot text,
  ADD COLUMN IF NOT EXISTS completed_helper_phone_snapshot text;

ALTER TABLE request_contacts
  ADD COLUMN IF NOT EXISTS helper_name_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_name_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_phone_snapshot text;

ALTER TABLE helper_ratings
  ADD COLUMN IF NOT EXISTS helper_name_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_name_snapshot text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('requests', 'customer_name_snapshot'),
      ('requests', 'customer_phone_snapshot'),
      ('requests', 'completed_helper_name_snapshot'),
      ('requests', 'completed_helper_phone_snapshot'),
      ('request_contacts', 'helper_name_snapshot'),
      ('request_contacts', 'customer_name_snapshot'),
      ('request_contacts', 'customer_phone_snapshot'),
      ('helper_ratings', 'helper_name_snapshot'),
      ('helper_ratings', 'customer_name_snapshot')
    ) AS expected(table_name, column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = expected.table_name
        AND c.column_name = expected.column_name
        AND c.data_type = 'text'
    )
  ) THEN
    RAISE EXCEPTION 'snapshot columns must be text';
  END IF;
END
$$;

-- Backfill only absent values. A missing user row is intentionally left blank.
UPDATE requests r
SET customer_name_snapshot = u.name
FROM users u
WHERE r.customer_id = u.id
  AND r.customer_name_snapshot IS NULL;

UPDATE requests r
SET customer_phone_snapshot = u.phone
FROM users u
WHERE r.customer_id = u.id
  AND r.customer_phone_snapshot IS NULL;

UPDATE requests r
SET completed_helper_name_snapshot = u.name
FROM users u
WHERE r.completed_helper_id = u.id
  AND r.completed_helper_name_snapshot IS NULL;

UPDATE requests r
SET completed_helper_phone_snapshot = u.phone
FROM users u
WHERE r.completed_helper_id = u.id
  AND r.completed_helper_phone_snapshot IS NULL;

UPDATE request_contacts rc
SET helper_name_snapshot = u.name
FROM users u
WHERE rc.helper_id = u.id
  AND rc.helper_name_snapshot IS NULL;

UPDATE request_contacts rc
SET customer_name_snapshot = u.name
FROM users u
WHERE rc.customer_id = u.id
  AND rc.customer_name_snapshot IS NULL;

UPDATE request_contacts rc
SET customer_phone_snapshot = u.phone
FROM users u
WHERE rc.customer_id = u.id
  AND rc.customer_phone_snapshot IS NULL;

UPDATE helper_ratings hr
SET helper_name_snapshot = u.name
FROM users u
WHERE hr.helper_id = u.id
  AND hr.helper_name_snapshot IS NULL;

UPDATE helper_ratings hr
SET customer_name_snapshot = u.name
FROM users u
WHERE hr.customer_id = u.id
  AND hr.customer_name_snapshot IS NULL;

ALTER TABLE request_contacts
  ALTER COLUMN helper_id DROP NOT NULL,
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE helper_ratings
  ALTER COLUMN helper_id DROP NOT NULL,
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE request_contacts
  DROP CONSTRAINT request_contacts_helper_id_fkey,
  ADD CONSTRAINT request_contacts_helper_id_fkey
    FOREIGN KEY (helper_id) REFERENCES users(id) ON DELETE SET NULL,
  DROP CONSTRAINT request_contacts_customer_id_fkey,
  ADD CONSTRAINT request_contacts_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE helper_ratings
  DROP CONSTRAINT helper_ratings_helper_id_fkey,
  ADD CONSTRAINT helper_ratings_helper_id_fkey
    FOREIGN KEY (helper_id) REFERENCES users(id) ON DELETE SET NULL,
  DROP CONSTRAINT helper_ratings_customer_id_fkey,
  ADD CONSTRAINT helper_ratings_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE requests
  DROP CONSTRAINT requests_completed_helper_id_fkey,
  ADD CONSTRAINT requests_completed_helper_id_fkey
    FOREIGN KEY (completed_helper_id) REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    WHERE rc.constraint_schema = 'public'
      AND rc.constraint_name IN (
        'request_contacts_helper_id_fkey',
        'request_contacts_customer_id_fkey',
        'helper_ratings_helper_id_fkey',
        'helper_ratings_customer_id_fkey',
        'requests_completed_helper_id_fkey'
      )
      AND rc.delete_rule <> 'SET NULL'
  ) THEN
    RAISE EXCEPTION 'physical account deletion foreign keys were not converted to ON DELETE SET NULL';
  END IF;
END
$$;

COMMIT;