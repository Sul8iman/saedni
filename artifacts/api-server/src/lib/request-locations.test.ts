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

test("all service categories accept origin and destination locations", () => {
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "delivery", fromArea: "الخوض", toArea: "بوشر" }),
    {
      success: true,
      data: { area: "الخوض", fromArea: "الخوض", toArea: "بوشر", fromGovernorate: null, toGovernorate: null },
    },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "shopping", fromArea: "بوشر", toArea: "بوشر" }),
    {
      success: true,
      data: { area: "بوشر", fromArea: "بوشر", toArea: "بوشر", fromGovernorate: null, toGovernorate: null },
    },
  );
  assert.equal(
    normalizeNewRequestLocation({
      category: "home_services",
      fromArea: "الخوض",
      toArea: "نزوى",
      fromGovernorate: "مسقط",
      toGovernorate: "الداخلية",
    }).success,
    true,
  );
  assert.deepEqual(
    normalizeNewRequestLocation({
      category: "government",
      fromArea: "الخوض",
      toArea: "نزوى",
      fromGovernorate: "الداخلية",
      toGovernorate: "الداخلية",
    }),
    { success: false, field: "fromGovernorate" },
  );
});

test("legacy route requests with an active single area are accepted temporarily", () => {
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "delivery", area: "بوشر" }),
    { success: true, data: { area: "بوشر", fromArea: null, toArea: null, fromGovernorate: null, toGovernorate: null } },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "delivery", area: "صور" }),
    { success: true, data: { area: "صور", fromArea: null, toArea: null, fromGovernorate: null, toGovernorate: null } },
  );
});

test("all new categories require both route endpoints while legacy area remains accepted", () => {
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "home_services" }),
    { success: false, field: "area" },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({ category: "home_services", area: "بوشر" }),
    { success: true, data: { area: "بوشر", fromArea: null, toArea: null, fromGovernorate: null, toGovernorate: null } },
  );
  assert.deepEqual(
    normalizeNewRequestLocation({
      category: "government",
      area: "السيب",
      fromArea: "الخوض",
      toArea: "بوشر",
    }),
    { success: true, data: { area: "الخوض", fromArea: "الخوض", toArea: "بوشر", fromGovernorate: null, toGovernorate: null } },
  );
});

test("new requests accept Oman locations and reject unsupported locations", () => {
  assert.equal(
    normalizeNewRequestLocation({ category: "delivery", fromArea: "صور", toArea: "نزوى", fromGovernorate: "جنوب الشرقية", toGovernorate: "الداخلية" }).success,
    true,
  );
  for (const area of ["مسقط القديمة", ""]) {
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

test("manual area matching includes either endpoint and historical area fallback", () => {
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
    true,
  );
  assert.equal(
    requestMatchesAreaFilter({ category: "home_services", area: "الخوض", fromArea: "الخوض", toArea: "نزوى" }, configuredAreas),
    true,
  );
  assert.equal(
    requestMatchesAreaFilter({ category: "transport", area: "الخوض", fromArea: null }, configuredAreas),
    true,
  );
  assert.equal(
    requestMatchesAreaFilter(
      { category: "delivery", area: "الخوض", fromArea: null, toArea: "بوشر" },
      configuredAreas,
    ),
    true,
  );
  assert.equal(
    requestMatchesAreaFilter(
      { category: "delivery", area: "الخوض", fromArea: null, toArea: "بوشر" },
      ["بوشر"],
    ),
    true,
  );
});