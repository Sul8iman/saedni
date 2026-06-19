---
name: Production schema migrations
description: How to apply DDL changes to the production DB when executeSql(production) is read-only
---

executeSql in production mode is read-only — you cannot run ALTER TABLE or any DDL via that tool.

**The rule:** Add an idempotent startup IIFE to `artifacts/api-server/src/app.ts` that runs the DDL using drizzle's `sql` template literal. The IIFE runs every boot but is safe because all statements use `IF NOT EXISTS` / `IF EXISTS`.

**Pattern:**
```typescript
import { sql as drizzleSql } from "drizzle-orm";

(async () => {
  try {
    await db.execute(drizzleSql`ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token text`);
    logger.info("Schema migration: column ensured");
  } catch (err) {
    logger.warn({ err }, "Schema migration check failed (non-fatal)");
  }
})();
```

**Why:** The production database gets the migration automatically when the production API server is redeployed. The dev DB can be migrated separately via `executeSql` (no environment arg) or `pnpm --filter @workspace/db run push`.

**How to apply:** Any time a new column or table is needed in production, add the `IF NOT EXISTS` DDL here rather than relying on drizzle-kit push (which only targets the dev DB via the local DATABASE_URL).
