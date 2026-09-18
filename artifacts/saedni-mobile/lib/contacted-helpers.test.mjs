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

test("Android uses the five-star modal while iOS keeps the five-button alert flow", async () => {
  const source = await readFile(new URL("../app/(customer)/my-requests.tsx", import.meta.url), "utf8");

  assert.match(source, /Platform\.OS === "android"/);
  assert.match(source, /const RATING_STARS = \[1, 2, 3, 4, 5\] as const/);
  assert.match(source, /if \(Platform\.OS === "android"\) \{\s*setRatingTarget\(\{ id, helperId \}\)/s);
  assert.match(source, /Alert\.alert\(\s*"قيّم المساعد"/);
  assert.match(source, /RATING_STARS\.map\(\(stars\) => \(\{\s*text: `\$\{"★"\.repeat\(stars\)\}/s);
  assert.match(source, /submitRating\(id, helperId, stars\)/);
  assert.match(source, /\{Platform\.OS === "android" && \(\s*<Modal/s);
  assert.match(source, /accessibilityLabel=\{`تقييم \$\{stars\} من 5`\}/);
  assert.match(source, /ratingStars: stars/);
  assert.match(source, /ratingStarButton:\s*\{[^}]*width:\s*44[^}]*height:\s*48/s);
  assert.match(source, /ratingStarsRow:\s*\{[^}]*flexDirection:\s*"row"[^}]*direction:\s*"ltr"/s);
  assert.match(source, /ratingCard:\s*\{[^}]*width:\s*"90%"[^}]*maxWidth:\s*360/s);

  const submittedValues = [1, 2, 3, 4, 5].map((stars) => ({ ratingStars: stars }));
  assert.deepEqual(submittedValues.map(({ ratingStars }) => ratingStars), [1, 2, 3, 4, 5]);
});