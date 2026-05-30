const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const MOBILE_DIR = path.resolve(__dirname, "..", "saedni-mobile");
const DIST_DIR = path.resolve(MOBILE_DIR, "dist");

console.log("[saedni-pwa] Building Expo web app for production…");

const result = spawnSync(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web"],
  {
    cwd: MOBILE_DIR,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  }
);

if (result.status !== 0) {
  console.error("[saedni-pwa] Build failed.");
  process.exit(1);
}

// Copy service worker if not already present
const swSrc = path.join(MOBILE_DIR, "public", "sw.js");
const swDst = path.join(DIST_DIR, "sw.js");
if (fs.existsSync(swSrc) && !fs.existsSync(swDst)) {
  fs.copyFileSync(swSrc, swDst);
  console.log("[saedni-pwa] Copied sw.js → dist/sw.js");
}

console.log("[saedni-pwa] Production build complete!");
