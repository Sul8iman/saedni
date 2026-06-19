---
name: expo-notifications permission API
description: Correct way to check/request notification permission with expo-notifications in this project
---

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
