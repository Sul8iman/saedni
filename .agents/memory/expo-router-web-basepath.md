---
name: Expo Router web basePath
description: How to configure expo-router 6 to serve the web export at a URL subpath (e.g. /saedni-pwa/).
---

## Rule
Set `experiments.baseUrl` in `app.json` (NOT `basePath` inside the expo-router plugin config).

```json
"experiments": {
  "typedRoutes": true,
  "reactCompiler": true,
  "baseUrl": "/saedni-pwa"
}
```

**Why:** expo-router 6 (`~6.0.17`+) validates plugin options strictly. `basePath` is not a recognised option and throws `ValidationError: Additional property "basePath" is not allowed`, aborting `expo export`.  `experiments.baseUrl` is the supported mechanism added in SDK 52 and is web-only (does not affect native builds).

**How to apply:** Any time an Expo web export must be served at a non-root subpath, add `experiments.baseUrl` to the project `app.json` under the `expo` key. Then run `expo export --platform web` from the mobile artifact directory.

## PWA notes for output: "single"
- `expo export` with `output: "single"` does NOT auto-generate `manifest.json`. Create it manually in `dist/` referencing the correct `start_url` and `scope` (`/saedni-pwa/`).
- Expo copies everything from `public/` into `dist/` automatically — put `sw.js` in `public/`.
- The server must serve `sw.js` with header `Service-Worker-Allowed: /saedni-pwa/` so the SW can control that scope.
