import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOmanPhone } from "./phone-normalization.ts";

test("normalizes supported Oman phone formats to one canonical value", () => {
  const expected = "96891234567";
  assert.equal(normalizeOmanPhone("91234567"), expected);
  assert.equal(normalizeOmanPhone("96891234567"), expected);
  assert.equal(normalizeOmanPhone("+96891234567"), expected);
  assert.equal(normalizeOmanPhone("0096891234567"), expected);
  assert.equal(normalizeOmanPhone("+968 9123-4567"), expected);
});

test("rejects phone values that are not an Oman local number", () => {
  assert.equal(normalizeOmanPhone("1234567"), null);
  assert.equal(normalizeOmanPhone("9689123456"), null);
  assert.equal(normalizeOmanPhone("not-a-phone"), null);
});
