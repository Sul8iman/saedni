import assert from "node:assert/strict";
import test from "node:test";
import { getRequestLocationLines, requestMatchesArea } from "./request-locations.ts";

test("legacy route requests show one saved location and no invented destination", () => {
  assert.deepEqual(
    getRequestLocationLines({
      category: "delivery",
      area: "بوشر",
      fromArea: null,
      toArea: null,
    }),
    [{ label: "الموقع", value: "بوشر" }],
  );
});

test("new route requests show both endpoints", () => {
  assert.deepEqual(
    getRequestLocationLines({
      category: "transport",
      area: "الخوض",
      fromArea: "الخوض",
      toArea: "بوشر",
    }),
    [
      { label: "من", value: "الخوض" },
      { label: "إلى", value: "بوشر" },
    ],
  );
});

test("partial route data falls back to one location instead of inventing an endpoint", () => {
  assert.deepEqual(
    getRequestLocationLines({
      category: "delivery",
      area: "الخوض",
      fromArea: "الخوض",
      toArea: null,
    }),
    [{ label: "الموقع", value: "الخوض" }],
  );
});

test("location filters match either route endpoint and preserve legacy area fallback", () => {
  assert.equal(requestMatchesArea({ area: "بوشر", fromArea: "الخوض", toArea: "بوشر" }, "بوشر"), true);
  assert.equal(requestMatchesArea({ area: "بوشر", fromArea: "الخوض", toArea: "بوشر" }, "الخوض"), true);
  assert.equal(requestMatchesArea({ area: "بوشر", fromArea: null, toArea: null }, "بوشر"), true);
  assert.equal(requestMatchesArea({ area: "بوشر", fromArea: "الخوض", toArea: "السيب" }, "بوشر"), true);
  assert.equal(requestMatchesArea({ area: "بوشر", fromArea: "الخوض", toArea: "السيب" }, "نزوى"), false);
});