import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeNewRequestLocation,
  requestMatchesAreaFilter,
} from "./request-locations.ts";

test("route requests require an active start and destination area", () => {
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "delivery", toArea: "بوشر" }),
    { success: false, field: "fromArea" },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "transport", fromArea: "الخوض" }),
    { success: false, field: "toArea" },
  );
});

test("route requests accept two active Muscat areas and permit the same area", () => {
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "delivery", fromArea: "الخوض", toArea: "بوشر" }),
    {
      success: true,
      data: { area: "الخوض", fromArea: "الخوض", toArea: "بوشر" },
    },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "shopping", fromArea: "بوشر", toArea: "بوشر" }),
    {
      success: true,
      data: { area: "بوشر", fromArea: "بوشر", toArea: "بوشر" },
    },
  );
});

test("single-location requests require an active area and discard route fields", () => {
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "home_services" }),
    { success: false, field: "area" },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({
      category: "government",
      area: "السيب",
      fromArea: "الخوض",
      toArea: "بوشر",
    }),
    { success: true, data: { area: "السيب", fromArea: null, toArea: null } },
  );
});

test("new requests reject non-Muscat and unsupported/inactive areas", () => {
  for (const area of ["صور", "مسقط القديمة", ""]) {
    assert.equal(
      normalizeNewRequestLocation({ category: "delivery", fromArea: area, toArea: "بوشر" }).success,
      false,
    );
    assert.equal(
      normalizeNewRequestLocation({ category: "home_services", area }).success,
      false,
    );
  }
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "untrusted-mode", area: "بوشر" }),
    { success: false, field: "category" },
  );
});

test("helper area matching uses route origin, single area, and historical area fallback", () => {
  const configuredAreas = ["الخوض"];
  assert.equal(
    requestMatchesAreaFilter(
      { category: "delivery", area: "الخوض", fromArea: "الخوض", toArea: "بوشر" },
      configuredAreas,
    ),
    true,
  );
  assert.equal(
    requestMatchesAreaFilter(
      { category: "delivery", area: "روي", fromArea: "روي", toArea: "الخوض" },
      configuredAreas,
    ),
    false,
  );
  assert.equal(
    requestMatchesAreaFilter({ category: "home_services", area: "الخوض" }, configuredAreas),
    true,
  );
  assert.equal(
    requestMatchesAreaFilter({ category: "transport", area: "الخوض", fromArea: null }, configuredAreas),
    true,
  );
});