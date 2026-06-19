---
name: expo-notifications permission API
description: Correct version, import pattern, and permission API for expo-notifications in this SDK 54 project
---

## VERSION — CRITICAL

SDK 54 requires expo-notifications@~0.29.14. Running `pnpm add expo-notifications` without a version
pin installs 56.x (SDK 56 ABI) which crashes the app immediately on launch — iOS loads the native
framework before any JS runs. Always pin: `expo-notifications@~0.29.14`.

## IMPORT PATTERN — never import at module top level

Use dynamic import() inside useEffect/async functions only:
```typescript
const Notifications = await import("expo-notifications");
```
Static top-level imports are safe to compile but setNotificationHandler() called at module load time
(before React Native bridge is ready) causes startup crashes.

## NOTIFICATION BEHAVIOR API (0.29.x)

**The rule:** `NotificationPermissionsStatus.granted` does not type-check in this version of expo-notifications. Use `ios?.status` with `IosAuthorizationStatus` enum values instead.

**Why:** `NotificationPermissionsStatus` extends `PermissionResponse` from `expo`, but that type is not resolvable in the TypeScript project graph. The `.granted` field exists at runtime but the compiler rejects it.

**How to apply:**
```typescript
import { IosAuthorizationStatus } from "expo-notifications";
import * as Notifications from "expo-notifications";

const isGranted = (p: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) =>
  p.ios?.status === IosAuthorizationStatus.AUTHORIZED ||
  p.ios?.status === IosAuthorizationStatus.PROVISIONAL;

const existing = await Notifications.getPermissionsAsync();
let granted = isGranted(existing);
if (!granted) {
  const result = await Notifications.requestPermissionsAsync();
  granted = isGranted(result);
}
```

This is iOS-only, which is fine since ساعدني only ships on iOS (TestFlight/App Store).

**Also note:** `NotificationBehavior` requires `shouldShowList: boolean` — must include it alongside `shouldShowBanner` in `setNotificationHandler`.
