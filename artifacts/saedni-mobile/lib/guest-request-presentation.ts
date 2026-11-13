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
