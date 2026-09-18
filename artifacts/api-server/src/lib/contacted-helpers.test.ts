import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { presentContactedHelper } from "./contacted-helpers.ts";

test("uses the helper account phone after repeated contact and keeps the latest method", () => {
  const customerPhone = "90000001";
  const helperPhone = "90000002";
  const firstContactedAt = new Date("2026-09-18T10:00:00.000Z");
  const lastContactedAt = new Date("2026-09-18T10:05:00.000Z");
  const repeatedContacts = [
    {
      helperId: 21,
      helperNameSnapshot: "مساعد محفوظ",
      contactMethod: "whatsapp" as const,
      firstContactedAt,
      lastContactedAt: firstContactedAt,
    },
    {
      helperId: 21,
      helperNameSnapshot: "مساعد محفوظ",
      contactMethod: "phone" as const,
      firstContactedAt,
      lastContactedAt,
    },
  ];
  const latestContact = repeatedContacts.reduce((latest, contact) =>
    contact.lastContactedAt > latest.lastContactedAt ? contact : latest,
  );
  const result = presentContactedHelper(
    latestContact,
    { name: "المساعد الحالي", phone: helperPhone, rating: 4.5 },
    { average: 4.8, count: 3 },
  );

  assert.equal(new Set([result.helperId]).size, 1);
  assert.equal(result.helperName, "المساعد الحالي");
  assert.equal(result.helperPhone, helperPhone);
  assert.equal(result.contactPhone, helperPhone);
  assert.notEqual(result.helperPhone, customerPhone);
  assert.notEqual(result.contactPhone, customerPhone);
  assert.equal(result.contactMethod, "phone");
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
  assert.equal(result.contactPhone, null);

  const routeSource = await readFile(new URL("../routes/requests.ts", import.meta.url), "utf8");
  const routeStart = routeSource.indexOf('router.get("/requests/:id/contacted-helpers"');
  assert.ok(routeStart >= 0);
  const contactedHelpersRoute = routeSource.slice(routeStart);
  assert.match(contactedHelpersRoute, /leftJoin\(usersTable,\s*eq\(usersTable\.id,\s*requestContactsTable\.helperId\)\)/);
  assert.match(contactedHelpersRoute, /phone:\s*usersTable\.phone/);
  assert.doesNotMatch(contactedHelpersRoute, /contactPhone:\s*contact\.contactPhone/);
  const presentationSource = await readFile(new URL("./contacted-helpers.ts", import.meta.url), "utf8");
  assert.match(presentationSource, /contactPhone:\s*helper\?\.phone\s*\?\?\s*null/);

  const contactStart = routeSource.indexOf('router.post("/requests/:id/contact"');
  assert.ok(contactStart >= 0);
  const contactRoute = routeSource.slice(contactStart, routeStart);
  assert.match(contactRoute, /helperId:\s*actor\.id/);
  assert.match(contactRoute, /target:\s*\[requestContactsTable\.requestId,\s*requestContactsTable\.helperId\]/);
  assert.match(contactRoute, /contactMethod:\s*parsed\.data\.contactMethod/);
  assert.doesNotMatch(contactRoute, /status\s*:/);
});