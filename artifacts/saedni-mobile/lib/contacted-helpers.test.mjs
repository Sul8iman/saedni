import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dedupeContactedHelpers } from "./contacted-helpers.ts";
import {
  formatRatingAccessibility,
  formatRatingScore,
} from "../../../lib/api-client-react/src/rating-display.ts";

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
  assert.match(source, /const RATING_ACCESSIBILITY_LABELS = \[\s*""\s*,\s*"التقييم 1 من 5"\s*,\s*"التقييم 2 من 5"\s*,\s*"التقييم 3 من 5"\s*,\s*"التقييم 4 من 5"\s*,\s*"التقييم 5 من 5"/s);
  assert.match(source, /if \(Platform\.OS === "android"\) \{\s*setRatingTarget\(\{ id, helperId \}\)/s);
  assert.match(source, /Alert\.alert\(\s*"قيّم المساعد"/);
  assert.match(source, /RATING_STARS\.map\(\(stars\) => \(\{\s*text: `\$\{"★"\.repeat\(stars\)\}/s);
  assert.match(source, /submitRating\(id, helperId, stars\)/);
  assert.match(source, /\{Platform\.OS === "android" && \(\s*<Modal/s);
  assert.match(source, /accessibilityLabel=\{RATING_ACCESSIBILITY_LABELS\[stars\]\}/);
  assert.match(source, /onPress=\{\(\) => setSelectedRating\(stars\)\}/);
  assert.match(source, /name=\{selectedRating !== null && stars <= selectedRating \? "star" : "star-outline"\}/);
  assert.match(source, /التقييم المختار: \$\{formatRatingScore\(selectedRating\)\}/);
  assert.match(source, /إرسال التقييم/);
  assert.match(source, /disabled=\{selectedRating === null \|\| endMutation\.isPending\}/);
  assert.match(source, /ratingStars: stars/);
  assert.match(source, /ratingStarButton:\s*\{[^}]*width:\s*44[^}]*height:\s*48/s);
  assert.match(source, /ratingStarsRow:\s*\{[^}]*flexDirection:\s*"row"[^}]*direction:\s*"rtl"/s);
  assert.match(source, /ratingCard:\s*\{[^}]*width:\s*"100%"[^}]*maxWidth:\s*360/s);
  assert.match(source, /closeRatingModal\(\);\s*submitRating\(target\.id, target\.helperId, stars\)/s);
  assert.match(source, /if \(!ratingTarget \|\| selectedRating === null \|\| endMutation\.isPending\) return/);
  assert.doesNotMatch(source, /onPress=\{\(\) => \{\s*if \(!ratingTarget\) return;\s*const target = ratingTarget;\s*setRatingTarget\(null\);\s*submitRating\(target\.id, target\.helperId, stars\);/s);

  const submittedValues = [1, 2, 3, 4, 5].map((stars) => ({ ratingStars: stars }));
  assert.deepEqual(submittedValues.map(({ ratingStars }) => ratingStars), [1, 2, 3, 4, 5]);
});

test("shared rating formatter keeps scores readable in Arabic RTL layouts", () => {
  assert.equal(formatRatingScore(5), "5/5");
  assert.equal(formatRatingScore(4), "4/5");
  assert.equal(formatRatingScore(4.5), "4.5/5");
  assert.equal(formatRatingScore("4.0"), "4/5");
  assert.equal(formatRatingAccessibility(4.5), "التقييم 4.5 من 5");
  assert.equal(formatRatingScore(null), null);
});

test("all mobile and web rating score renderers use the shared /5 formatter", async () => {
  const [customerSource, profileSource, statisticsSource, webProfileSource] = await Promise.all([
    readFile(new URL("../app/(customer)/my-requests.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/(helper)/profile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/(admin)/statistics.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../saidni/src/pages/Profile.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(customerSource, /formatRatingScore\(helper\.rating\)/);
  assert.match(customerSource, /formatRatingScore\(stars\)/);
  assert.match(customerSource, /ratingScore/);
  assert.match(profileSource, /formatRatingScore\(profile\.rating\)/);
  assert.match(profileSource, /writingDirection: "ltr"/);
  assert.match(statisticsSource, /formatRatingScore\(stats\.ratings\.averageStars\)/);
  assert.match(statisticsSource, /writingDirection: "ltr"/);
  assert.match(webProfileSource, /formatRatingScore\(user\.rating\)/);
  assert.match(webProfileSource, /dir="ltr"/);
});

test("mobile request lists keep customer ownership and helper areas separate from visibility", async () => {
  const [customerSource, helperSource, queryKeysSource] = await Promise.all([
    readFile(new URL("../app/(customer)/my-requests.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/(helper)/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("./request-query-keys.ts", import.meta.url), "utf8"),
  ]);

  assert.match(customerSource, /\/api\/requests\?customerId=\$\{user\.id\}/);
  assert.doesNotMatch(customerSource, /preferredAreas|currentUser\.area|user\.area/);
  assert.match(helperSource, /const \[areaFilters, setAreaFilters\] = useState<string\[\]>\(\[\]\)/);
  assert.match(helperSource, /for \(const area of areaFilters\) query\.append\("area", area\)/);
  assert.match(helperSource, /setAreaFilters\(\[\]\)/);
  assert.doesNotMatch(helperSource, /preferredAreas/);
  assert.match(helperSource, /areaFilters\.includes\(f\.value\)/);
  assert.match(queryKeysSource, /helperAvailable: \(/);
  assert.doesNotMatch(queryKeysSource, /preferredAreas|currentUser\.area/);
});