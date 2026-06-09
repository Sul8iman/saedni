---
name: Expo SecureStore + AsyncStorage dual-write
description: Three confirmed bugs that caused persistent logout on every app launch in Expo/React Native TestFlight builds.
---

## Bug 1 — secureGet never reached AsyncStorage fallback

`SecureStore.getItemAsync(key)` returns `null` (not throws) for missing or unreadable keys.
A `catch`-only fallback to AsyncStorage therefore never ran — if SecureStore returned null for any reason, the token was invisible even if it existed in AsyncStorage.

**Fix:** Explicitly check both stores in sequence:
```ts
let ssVal: string | null = null;
try { ssVal = await SecureStore.getItemAsync(key); } catch {}
if (ssVal != null) return ssVal;
// Always fall through — null means missing, not an error
return AsyncStorage.getItem(key).catch(() => null);
```

## Bug 2 — secureSet wrote to only ONE store

`secureSet` verified SecureStore write and returned early — AsyncStorage was never written.
If SecureStore returned null on the next read (any cause), AsyncStorage had nothing as backup.

**Fix:** Always dual-write to both stores regardless of success:
```ts
await Promise.allSettled([
  SecureStore.setItemAsync(key, value),
  AsyncStorage.setItem(key, value),
]);
```

## Bug 3 — second OTP login overwrites DB token

Every `POST /auth/verify-otp` generated `randomUUID()` and overwrote `usersTable.authToken`.
A second login (re-entering OTP, testing from another device) invalidated the token already saved on device — causing 401 on next launch → token cleared → login required.

**Fix:** Preserve existing token if present; only generate new one after explicit logout:
```ts
const authToken = user.authToken ?? randomUUID();
```
Logout explicitly sets `authToken: null` in DB, so the next login after logout gets a fresh token.

**Why:** All three bugs compounded — even if one was fixed the others masked it.
