import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { presentContactedHelper } from "./contacted-helpers.ts";

test("uses the helper account phone and latest contact time", () => {
  const firstContactedAt = new Date("2026-09-18T10:00:00.000Z");
  const lastContactedAt = new Date("2026-09-18T10:05:00.000Z");
  const result = presentContactedHelper(
    {
      helperId: 21,
      helperNameSnapshot: "مساعد محفوظ",
      contactMethod: "whatsapp",
      firstContactedAt,
      lastContactedAt,
    },
    { name: "المساعد الحالي", phone: "+96891234567", rating: 4.5 },
    { average: 4.8, count: 3 },
  );

  assert.equal(result.helperName, "المساعد الحالي");
  assert.equal(result.helperPhone, "+96891234567");
  assert.notEqual(result.helperPhone, "+96899876543");
  assert.equal(result.contactMethod, "whatsapp");
  assert.equal(result.contactedAt, lastContactedAt.toISOString());
});

test("keeps the helper-name snapshot without exposing a customer phone after deletion", async () => {
  const result = presentContactedHelper(
    {
      helperId: null,
      helperNameSnapshot: "مساعد محذوف",
      contactMethod: "phone",
      firstContactedAt: new Date("2026-09-18T10:00:00.000Z"),
      lastContactedAt: new Date("2026-09-18T10:01:00.000Z"),
    },
    undefined,
    undefined,
  );

  assert.equal(result.helperName, "مساعد محذوف");
  assert.equal(result.helperPhone, null);

  const routeSource = await readFile(new URL("../routes/requests.ts", import.meta.url), "utf8");
  const routeStart = routeSource.indexOf('router.get("/requests/:id/contacted-helpers"');
  assert.ok(routeStart >= 0);
  const contactedHelpersRoute = routeSource.slice(routeStart);
  assert.match(contactedHelpersRoute, /phone:\s*usersTable\.phone/);
  assert.doesNotMatch(contactedHelpersRoute, /contactPhone:\s*contact\.contactPhone/);
});