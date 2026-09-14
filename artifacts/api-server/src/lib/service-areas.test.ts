import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_SERVICE_AREAS,
  hasConfiguredServiceArea,
  helperServesArea,
  matchesUserAreaFilter,
  parsePreferredAreas,
  validatePreferredAreas,
} from "./service-areas.ts";

test("uses the reviewed 16-area active catalog", () => {
  assert.equal(ACTIVE_SERVICE_AREAS.length, 16);
  assert.deepEqual(ACTIVE_SERVICE_AREAS.slice(-2).map((area) => area.name), ["مطرح", "قريات"]);
});

test("treats malformed, null, empty, and unusable legacy JSON as no areas", () => {
  for (const value of [null, undefined, "", "not-json", "{}", "[]", "[1, null, {}]"]) {
    assert.deepEqual(parsePreferredAreas(value), []);
    assert.equal(hasConfiguredServiceArea(value), false);
  }
});

test("deduplicates legacy areas without activating unsupported locations", () => {
  assert.deepEqual(parsePreferredAreas('["بوشر","بوشر","صور",""]'), ["بوشر", "صور"]);
  assert.equal(hasConfiguredServiceArea('["صور"]'), false);
  assert.equal(helperServesArea('["بوشر","بوشر"]', "بوشر"), true);
});

test("accepts only non-empty selections from the active catalog", () => {
  assert.deepEqual(validatePreferredAreas(["بوشر", "بوشر", "السيب"]), ["بوشر", "السيب"]);
  assert.equal(validatePreferredAreas([]), null);
  assert.equal(validatePreferredAreas(["بوشر", "صور"]), null);
  assert.equal(validatePreferredAreas(["بوشر", 1]), null);
});

test("filters helpers by any configured preferred area with OR semantics", () => {
  const helper = { userType: "helper", preferredAreas: JSON.stringify(["بوشر", "السيب"]) };
  assert.equal(matchesUserAreaFilter(helper, ["السيب"], false), true);
  assert.equal(matchesUserAreaFilter(helper, ["الخوير", "السيب"], false), true);
  assert.equal(matchesUserAreaFilter(helper, ["الخوير"], false), false);
});

test("filters customers by their primary area instead of preferred areas", () => {
  const customer = { userType: "customer", area: "مطرح", preferredAreas: JSON.stringify(["السيب"]) };
  assert.equal(matchesUserAreaFilter(customer, ["مطرح"], false), true);
  assert.equal(matchesUserAreaFilter(customer, ["السيب"], false), false);
});

test("supports all areas and no-area selections without duplicate matches", () => {
  const helper = { userType: "helper", preferredAreas: JSON.stringify(["بوشر", "السيب"]) };
  const customer = { userType: "customer", area: null };
  assert.equal(matchesUserAreaFilter(helper, [], false), true);
  assert.equal(matchesUserAreaFilter(customer, [], false), true);
  assert.equal(matchesUserAreaFilter(customer, ["بوشر"], true), true);
  assert.equal(matchesUserAreaFilter(helper, ["بوشر"], true), true);
});