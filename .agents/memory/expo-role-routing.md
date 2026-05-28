---
name: Expo role-based routing
description: Navigation pattern for role-gated screens in the saedni-mobile Expo app.
---

The app has three user roles (customer, helper, admin) each with separate tab/stack layouts.

**Pattern:**
- `app/index.tsx` — reads `useAuth()` and `<Redirect>`s to the correct group
- `app/(auth)/` — login + register (Stack, no header)
- `app/(customer)/` — Tabs: index (new request) | my-requests | profile
- `app/(helper)/` — Tabs: index (available requests) | my-requests | profile
- `app/(admin)/` — Stack: index (dashboard) | users
- `app/(tabs)/` — scaffold remnant, left as redirect to `/` to avoid Metro errors

**Why:** Expo Router file-based routing makes group-per-role clean and avoids conditional rendering inside tab layouts.

**How to apply:** Register all groups in root `_layout.tsx` Stack with `headerShown: false`. The `app/index.tsx` redirect is the single source of truth for routing after auth.
