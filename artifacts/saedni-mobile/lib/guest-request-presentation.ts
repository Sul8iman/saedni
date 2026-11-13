export interface GuestRequestForList {
  id: number;
  category: string;
  status: string;
  isPaused?: boolean | null;
  createdAt: string;
  area?: string | null;
  fromArea?: string | null;
  toArea?: string | null;
}

export function filterGuestRequests<T extends GuestRequestForList>(
  requests: T[],
  category: string,
  area: string,
): T[] {
  return requests
    .filter((request) => request.status === "available" && request.isPaused !== true)
    .filter((request) => category === "all" || request.category === category)
    .filter((request) => area === "all"
      || request.fromArea === area
      || request.toArea === area
      || request.area === area)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function relativeUnit(value: number, singular: string, dual: string, plural: string): string {
  if (value === 1) return `منذ ${singular}`;
  if (value === 2) return `منذ ${dual}`;
  return `منذ ${value} ${plural}`;
}

export function formatRelativePublicationTime(
  value: string | null | undefined,
  now = Date.now(),
): string {
  if (!value) return "وقت النشر غير متوفر";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "وقت النشر غير متوفر";

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "نُشر الآن";
  if (elapsedMinutes < 60) {
    return relativeUnit(elapsedMinutes, "دقيقة", "دقيقتين", "دقائق");
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return relativeUnit(elapsedHours, "ساعة", "ساعتين", "ساعات");
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return relativeUnit(elapsedDays, "يوم", "يومين", "أيام");
}
