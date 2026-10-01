import assert from "node:assert/strict";
import test from "node:test";
import { getRequestLocationLines } from "./categories.ts";

test("legacy route requests display one location without inventing a destination", () => {
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

test("new route requests display both endpoints", () => {
  assert.deepEqual(
    getRequestLocationLines({
      category: "delivery",
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