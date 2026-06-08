---
name: Production API auth constants
description: Admin login credentials are hardcoded in auth.ts, not stored in DB or env vars
---
In `artifacts/api-server/src/routes/auth.ts`:
- `ADMIN_PHONE = "98584898"` and `ADMIN_PIN = "2724"` are hardcoded constants.
- The DB must have a user row with that phone for the login to complete (it does: id=7).
- Regular users authenticate via OTP only — `passwordHash` field is always `""`.

**Why:** MVP simplicity — avoids hashing/bcrypt for admin in v1.

**How to apply:** When testing production admin panel, use phone 98584898 + PIN 2724. Demo accounts customer=96891000001, helper=96891000003 exist in prod DB (seeded June 2026).
