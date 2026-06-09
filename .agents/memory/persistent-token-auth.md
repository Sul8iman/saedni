---
name: Persistent Token Auth
description: How the mobile app's persistent login works — token stored in SecureStore, validated against DB on launch.
---

# Persistent Token Auth

**Why:** In-memory express sessions are lost on server restart, forcing re-login. The mobile app needs auth that survives server restarts, app close, and phone reboots.

**How it works:**
- On login (`verify-otp`, `admin-login`) the server generates a `randomUUID()` token, saves it to `users.auth_token` (unique column), and returns `{ user, token }` in the response.
- The mobile `AuthContext` stores the token in `expo-secure-store` (AsyncStorage fallback) under key `@saedni/authToken`.
- On app launch, `AuthContext` reads the stored token and calls `GET /api/auth/me` with `Authorization: Bearer <token>`. The server looks up the user by token in DB — no session cookie needed.
- 401 response → clear storage, force re-login. 403 response → user blocked, show Arabic alert, clear storage.
- Logout calls `POST /api/auth/logout` (clears `auth_token` in DB) and deletes SecureStore entries.

**Single active token:** Each new login overwrites the old token — only one device stays logged in at a time (MVP limitation).

**How to apply:**
- Token middleware is in `artifacts/api-server/src/app.ts` (async middleware, before session middleware).
- Session middleware skips cookie lookup if `_tokenUserId` is set by the token middleware.
- `safeUser()` in `auth.ts` strips both `passwordHash` and `authToken` — never expose the token in user objects.
- `setSession(user, token)` is the login path in AuthContext; `setUser(user)` is for local preference updates (no token change).

**Production DB:** On first publish after this change, Replit's Publish flow auto-adds the `auth_token` column. Do not write migration scripts.
