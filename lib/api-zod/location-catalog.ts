export const OMAN_LOCATION_CATALOG = [
  {
    governorate: "مسقط",
    locations: [
      "مسقط", "بوشر", "الخوير", "الغبرة", "الموالح", "السيب", "العامرات",
      "المعبيلة", "الخوض", "الأنصب", "العذيبة", "القرم", "غلا", "روي", "مطرح", "قريات",
    ],
  },
  { governorate: "ظفار", locations: ["صلالة", "طاقة", "مرباط", "رخيوت", "ثمريت", "ضلكوت", "المزيونة", "مقشن", "شليم وجزر الحلانيات", "سدح"] },
  { governorate: "مسندم", locations: ["خصب", "دبا", "بخاء", "مدحاء"] },
  { governorate: "البريمي", locations: ["البريمي", "محضة", "السنينة"] },
  { governorate: "الداخلية", locations: ["نزوى", "بهلاء", "منح", "الحمراء", "أدم", "إزكي", "سمائل", "بدبد", "الجبل الأخضر"] },
  { governorate: "شمال الباطنة", locations: ["صحار", "شناص", "لوى", "صحم", "الخابورة", "السويق"] },
  { governorate: "جنوب الباطنة", locations: ["الرستاق", "العوابي", "نخل", "وادي المعاول", "بركاء", "المصنعة"] },
  { governorate: "شمال الشرقية", locations: ["إبراء", "المضيبي", "بدية", "القابل", "وادي بني خالد", "دماء والطائيين", "سناو"] },
  { governorate: "جنوب الشرقية", locations: ["صور", "الكامل والوافي", "جعلان بني بوحسن", "جعلان بني بوعلي", "مصيرة"] },
  { governorate: "الظاهرة", locations: ["عبري", "ينقل", "ضنك"] },
  { governorate: "الوسطى", locations: ["هيماء", "محوت", "الدقم", "الجازر"] },
] as const;

export const ACTIVE_SERVICE_AREAS = OMAN_LOCATION_CATALOG.flatMap(
  ({ governorate, locations }) =>
    locations.map((name, index) => ({
      name,
      governorate,
      sortOrder: index + 1,
    })),
);

export const OMAN_GOVERNORATES = OMAN_LOCATION_CATALOG.map(({ governorate }) => governorate);

export function locationsForGovernorate(governorate: string | null | undefined): readonly string[] {
  return OMAN_LOCATION_CATALOG.find((entry) => entry.governorate === governorate)?.locations ?? [];
}

export function isValidGovernorateLocation(
  governorate: string | null | undefined,
  location: string | null | undefined,
): boolean {
  return Boolean(governorate && location && locationsForGovernorate(governorate).includes(location));
}
