---
name: EAS build domain configuration
description: EXPO_PUBLIC_DOMAIN must be in eas.json production env block for native builds
---
In Expo native builds, `process.env.EXPO_PUBLIC_*` variables are baked in at build time from `eas.json`.
If `EXPO_PUBLIC_DOMAIN` is missing, `getApiUrl()` returns an empty BASE and all fetch() calls fail silently on device.

Production value: `help-me-om.replit.app` (the Replit autoscale deployment).
Apple Team ID: `226T25Z67X` (not B — easy typo).
iOS buildNumber: at "3" as of June 2026.

**How to apply:** Any time the production API URL changes, update `eas.json` > `build.production.env.EXPO_PUBLIC_DOMAIN` and trigger a new EAS build.
