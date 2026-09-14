export const ACTIVE_SERVICE_AREAS = [
  { name: "مسقط", governorate: "مسقط", sortOrder: 1 },
  { name: "بوشر", governorate: "مسقط", sortOrder: 2 },
  { name: "الخوير", governorate: "مسقط", sortOrder: 3 },
  { name: "الغبرة", governorate: "مسقط", sortOrder: 4 },
  { name: "الموالح", governorate: "مسقط", sortOrder: 5 },
  { name: "السيب", governorate: "مسقط", sortOrder: 6 },
  { name: "العامرات", governorate: "مسقط", sortOrder: 7 },
  { name: "المعبيلة", governorate: "مسقط", sortOrder: 8 },
  { name: "الخوض", governorate: "مسقط", sortOrder: 9 },
  { name: "الأنصب", governorate: "مسقط", sortOrder: 10 },
  { name: "العذيبة", governorate: "مسقط", sortOrder: 11 },
  { name: "القرم", governorate: "مسقط", sortOrder: 12 },
  { name: "غلا", governorate: "مسقط", sortOrder: 13 },
  { name: "روي", governorate: "مسقط", sortOrder: 14 },
  { name: "مطرح", governorate: "مسقط", sortOrder: 15 },
  { name: "قريات", governorate: "مسقط", sortOrder: 16 },
] as const;

const activeAreaNames = new Set<string>(ACTIVE_SERVICE_AREAS.map((area) => area.name));

export function isActiveServiceArea(area: unknown): area is string {
  return typeof area === "string" && activeAreaNames.has(area);
}

/**
 * Legacy preferred_areas is JSON text. Invalid, null, empty, or non-string
 * values intentionally become "no configured areas" rather than throwing.
 */
export function parsePreferredAreas(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((area): area is string => typeof area === "string" && area.length > 0))];
  } catch {
    return [];
  }
}

export function hasConfiguredServiceArea(value: string | null | undefined): boolean {
  return parsePreferredAreas(value).some((area) => isActiveServiceArea(area));
}

export function helperServesArea(value: string | null | undefined, area: string): boolean {
  return parsePreferredAreas(value).includes(area);
}

export function validatePreferredAreas(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const areas = [...new Set(value)];
  return areas.length > 0 && areas.every((area) => isActiveServiceArea(area)) ? areas : null;
}