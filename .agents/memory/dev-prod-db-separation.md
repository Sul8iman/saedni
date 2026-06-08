---
name: Dev vs prod DB separation
description: Dev and production Replit PostgreSQL databases are separate instances
---
Confirmed by checking the same user ID (24) having different phone numbers in dev vs prod.

- `executeSql({ environment: "development" })` → dev DB, all operations including INSERT/UPDATE
- `executeSql({ environment: "production" })` → prod DB read-only replica; INSERT/UPDATE not allowed
- Multi-column SELECTs on prod replica show `START TRANSACTION / ROLLBACK` in output — use single columns or COUNT(*) to verify data
- To seed production: call the production API endpoints directly (register + verify-otp)

**Why:** Replit manages separate databases per environment for isolation.
