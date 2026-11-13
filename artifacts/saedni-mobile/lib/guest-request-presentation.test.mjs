import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { filterGuestRequests } from "./guest-request-presentation.ts";
const guestScreen = await readFile(new URL("../app/(guest)/index.tsx", import.meta.url), "utf8");

test("guest filters count every matching active, unpaused request in the response", () => {
  const requests = [
    { id: 2, category: "delivery", status: "available", isPaused: false, area: "بوشر", createdAt: "2026-11-13T08:00:00.000Z" },
    { id: 1, category: "delivery", status: "available", isPaused: false, area: "بوشر", createdAt: "2026-11-13T09:00:00.000Z" },
    { id: 3, category: "delivery", status: "available", isPaused: false, area: "السيب", createdAt: "2026-11-13T07:00:00.000Z" },
    { id: 4, category: "shopping", status: "available", isPaused: false, area: "بوشر", createdAt: "2026-11-13T06:00:00.000Z" },
    { id: 5, category: "delivery", status: "available", isPaused: true, area: "بوشر", createdAt: "2026-11-13T05:00:00.000Z" },
    { id: 6, category: "delivery", status: "completed", isPaused: false, area: "بوشر", createdAt: "2026-11-13T04:00:00.000Z" },
  ];

  const matching = filterGuestRequests(requests, "delivery", "بوشر");
  assert.deepEqual(matching.map((request) => request.id), [1, 2]);
  assert.equal(matching.length, 2);
});

test("guest filtering preserves both route endpoints and legacy area fallback", () => {
  const route = { id: 1, category: "transport", status: "available", fromArea: "الخوض", toArea: "بوشر", createdAt: "2026-11-13T09:00:00.000Z" };
  const legacy = { id: 2, category: "delivery", status: "available", area: "السيب", createdAt: "2026-11-13T08:00:00.000Z" };
  assert.deepEqual(filterGuestRequests([route, legacy], "all", "بوشر").map((request) => request.id), [1]);
  assert.deepEqual(filterGuestRequests([route, legacy], "all", "السيب").map((request) => request.id), [2]);
});

test("guest screen keeps compact filters, complete details, and protected contact", () => {
  assert.match(guestScreen, /الطلبات المتاحة/);
  assert.match(guestScreen, /v === "all" \? "الكل"/);
  assert.match(guestScreen, /setFilterSheet\("service"\)/);
  assert.match(guestScreen, /setFilterSheet\("location"\)/);
  assert.match(guestScreen, /data=\{requests\}/);
  assert.match(guestScreen, /موعد التنفيذ:/);
  assert.match(guestScreen, /numberOfLines=\{2\} ellipsizeMode="tail"/);
  assert.match(guestScreen, /تاريخ ووقت النشر:/);
  assert.match(guestScreen, /showWall\("سجّل الدخول أو أنشئ حساباً للتواصل مع صاحب الطلب", "helper"\)/);
  assert.match(guestScreen, /testID="guest-request-help"/);
  assert.match(guestScreen, /testID="guest-help-others"/);
  assert.doesNotMatch(guestScreen, /تصفح الطلبات|أنت تتصفح كضيف|سجّل الدخول للتواصل مع صاحب الطلب/);
  assert.doesNotMatch(guestScreen, /customerPhone|customerId|authToken|helperPhone/i);
  const cardStart = guestScreen.indexOf("const renderItem");
  const cardEnd = guestScreen.indexOf("      </TouchableOpacity>", cardStart);
  const cardSource = guestScreen.slice(cardStart, cardEnd);
  assert.doesNotMatch(cardSource, /formatRelativePublicationTime|تاريخ ووقت النشر|publishTxt/);
  assert.match(cardSource, /موعد التنفيذ:/);
});
