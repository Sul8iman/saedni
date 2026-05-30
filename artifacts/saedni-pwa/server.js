const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const MOBILE_DIR = path.resolve(__dirname, "..", "saedni-mobile");
const DIST_DIR = path.resolve(MOBILE_DIR, "dist");
const PORT = parseInt(process.env.PORT || "3000", 10);
const BASE = "/saedni-pwa";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function ensureBuild() {
  const indexPath = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(indexPath) && process.env.FORCE_REBUILD !== "true") {
    console.log(`[saedni-pwa] Serving existing build from ${DIST_DIR}`);
    return;
  }
  console.log("[saedni-pwa] Building Expo web app — first run takes ~3 min…");
  const result = spawnSync(
    "pnpm",
    ["exec", "expo", "export", "--platform", "web"],
    {
      cwd: MOBILE_DIR,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
        EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN || "",
      },
    }
  );
  if (result.status !== 0) {
    console.error("[saedni-pwa] Expo web build failed.");
    process.exit(1);
  }
  // Ensure service worker lands in dist (Expo copies public/ automatically, but just in case)
  const swSrc = path.join(MOBILE_DIR, "public", "sw.js");
  const swDst = path.join(DIST_DIR, "sw.js");
  if (fs.existsSync(swSrc) && !fs.existsSync(swDst)) {
    fs.copyFileSync(swSrc, swDst);
    console.log("[saedni-pwa] Copied sw.js → dist/sw.js");
  }
  console.log("[saedni-pwa] Build complete!");
}

function serveRequest(req, res) {
  let urlPath = (req.url || "/").split("?")[0];

  // Strip the base path prefix
  if (urlPath.startsWith(BASE + "/")) {
    urlPath = urlPath.slice(BASE.length);
  } else if (urlPath === BASE) {
    urlPath = "/";
  }

  // Prevent path traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(DIST_DIR, safePath);

  // Directory → index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // Not found → try .html, then SPA fallback
  if (!fs.existsSync(filePath)) {
    const withHtml = filePath + ".html";
    if (fs.existsSync(withHtml)) {
      filePath = withHtml;
    } else {
      filePath = path.join(DIST_DIR, "index.html");
    }
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const headers = { "content-type": contentType };

  if (urlPath === "/sw.js") {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    headers["Service-Worker-Allowed"] = BASE + "/";
  } else if (urlPath.includes("/_expo/static/") || urlPath.includes("/assets/")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "no-cache";
  }

  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
}

ensureBuild();

const server = http.createServer(serveRequest);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[saedni-pwa] Listening on port ${PORT}  →  /saedni-pwa/`);
});
