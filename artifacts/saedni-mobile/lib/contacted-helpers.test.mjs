import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dedupeContactedHelpers } from "./contacted-helpers.ts";

test("deduplicates a helper by id and keeps the latest contact method", () => {
  const result = dedupeContactedHelpers([
    {
      helperId: 21,
      helperName: "مساعد",
      helperPhone: "+96891234567",
      rating: 4,
      ratingCount: 2,
      contactMethod: "whatsapp",
      contactedAt: "2026-09-18T10:00:00.000Z",
    },
    {
      helperId: 21,
      helperName: "مساعد",
      helperPhone: "+96891234567",
      rating: 4,
      ratingCount: 2,
      contactMethod: "phone",
      contactedAt: "2026-09-18T10:05:00.000Z",
    },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.helperId, 21);
  assert.equal(result[0]?.contactMethod, "phone");
  assert.equal(result[0]?.contactedAt, "2026-09-18T10:05:00.000Z");
});

test("request refresh explicitly refetches request and user-scoped contacted-helper queries", async () => {
  const source = await readFile(new URL("../app/(customer)/my-requests.tsx", import.meta.url), "utf8");

  assert.match(source, /queryKey: requestQueryKeys\.contactedHelpers\(viewerId, requestId\)/);
  assert.match(source, /queryKey: \["contacted-helpers", user\.id\]/);
  assert.match(source, /await Promise\.all\(\[refetch\(\), refetchContactedHelpers\(\)\]\)/);
  assert.match(source, /useFocusEffect/);
});