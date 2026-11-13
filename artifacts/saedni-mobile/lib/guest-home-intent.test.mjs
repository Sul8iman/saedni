import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getPostAuthDestination, normalizeGuestIntent } from "./guest-home-intent.ts";

test("only the two supported guest intents are accepted", () => {
  assert.equal(normalizeGuestIntent("customer"), "customer");
  assert.equal(normalizeGuestIntent("helper"), "helper");
  assert.equal(normalizeGuestIntent("admin"), null);
  assert.equal(normalizeGuestIntent(undefined), null);
});

test("successful authentication resumes the requested role when it exists", () => {
  assert.deepEqual(getPostAuthDestination("customer", ["customer"]), {
    path: "/(customer)",
    role: "customer",
  });
  assert.deepEqual(getPostAuthDestination("helper", ["customer", "helper"]), {
    path: "/(helper)",
    role: "helper",
  });
});

test("an unavailable intent falls back to normal role routing", () => {
  assert.deepEqual(getPostAuthDestination("helper", ["customer"]), { path: "/", role: null });
  assert.deepEqual(getPostAuthDestination(null, ["helper"]), { path: "/", role: null });
});

test("signed-out launch opens public requests and actions preserve their intent", async () => {
  const [index, guest] = await Promise.all([
    readFile(new URL("../app/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/(guest)/index.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(index, /if \(isGuest \|\| !user\) return <Redirect href="\/\(guest\)" \/>/);
  assert.match(guest, /testID="guest-request-help"/);
  assert.match(guest, /testID="guest-help-others"/);
  assert.match(guest, /intent=\{wallIntent\}/);
  assert.match(guest, /item\.status === "available"/);
  assert.match(guest, /new Date\(b\.createdAt\)\.getTime\(\) - new Date\(a\.createdAt\)\.getTime\(\)/);
  assert.match(guest, /تعذر تحميل الطلبات/);
  assert.match(guest, /إعادة المحاولة/);
});
