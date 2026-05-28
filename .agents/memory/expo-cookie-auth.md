---
name: Expo cookie auth
description: How session cookies from an Express backend work in Expo/React Native apps in this project.
---

The backend uses in-memory sessions with signed cookies (`sid`). CORS is configured `origin: true, credentials: true`.

**Rule:** In `app/_layout.tsx`, patch global fetch before any other code runs:

```ts
const _origFetch = global.fetch;
global.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  _origFetch(input, { credentials: "include", ...init });
```

**Why:** React Native's `fetch` does not automatically include cookies the way browsers do. Without this patch, every API call creates a new session and auth state is lost between requests. The generated `customFetch` in `@workspace/api-client-react` does not set `credentials` itself.

**How to apply:** Always include this patch at the top of `app/_layout.tsx` (outside any component) for any Expo app in this monorepo that uses the session-cookie auth backend.
