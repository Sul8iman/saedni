---
name: Admin push notification architecture
description: How admin OTP push notifications are structured — server module, mobile hook, notification tap routing.
---

## Server — Unified Push Module
`artifacts/api-server/src/lib/push.ts`
- `sendAdminOtpPush(notificationId, userId, phone, requestTime)` — the single entry point.
- Idempotency: `notifiedOtpIds: Set<number>` — second call for same ID is suppressed.
- Dedup: tokens collected via `Set<string>` — one push per physical device even if two admin users share a device.
- Queries all non-blocked users with `expo_push_token IS NOT NULL`, filters by role `admin` or `userType === "admin"` in JS (roles column is text JSON, not PG array).
- Sends via Expo push API in batches of 100.

**Why separate module:** helper notifications live in requests.ts (unchanged, avoids regression risk); admin OTP push is new and goes in lib/push.ts. Both use same Expo push endpoint.

## Server — auth.ts trigger points
`createOtpNotification()` returns `Promise<number | null>` via `.returning({ id })`.
Three call sites (register, dual-role register, login) all do:
```typescript
const notifId = await createOtpNotification({ ... });
if (notifId != null) void sendAdminOtpPush(notifId, userId, phone, new Date().toISOString());
```
`void` makes the push fire-and-forget — it does not block the HTTP response.

## Mobile — Push Registration
`artifacts/saedni-mobile/hooks/usePushNotifications.ts`
- `useAdminPushRegistration(isAdmin)` — mirrors `useHelperPushRegistration`; runs once per session.
- Called from `(admin)/index.tsx` with `useAdminPushRegistration(true)`.
- Uses the same `savePushTokenToServer` → `PATCH /api/auth/push-token` (Bearer token).
- `readAuthToken()` is now exported (was private) so `_layout.tsx` can call it.

## Mobile — Notification Tap Handler
`artifacts/saedni-mobile/app/_layout.tsx` → `NotificationHandler`
- `data.notificationType === "otp_request"` (note: helper uses `data.type === "new_request"` — different key names by convention).
- On tap: fires `PATCH /api/admin/notifications/:id/read` with Bearer token (fire-and-forget).
- Navigates: `/(admin)/user-detail?id=<userId>` or fallback with `id=0&fallbackPhone=…&fallbackTime=…`.

## Build Numbers
- Build 22: duplicate push bug fix (server only, no new iOS build)
- Build 23: admin OTP push (buildNumber 23, Build ID dd486565-5ca5-423d-a125-5494270d567f)
