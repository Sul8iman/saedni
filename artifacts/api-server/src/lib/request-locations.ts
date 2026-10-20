import { isActiveServiceArea } from "./service-areas.ts";
import { isValidGovernorateLocation } from "@workspace/api-zod/locations";

export const REQUEST_CATEGORIES = [
  "delivery", "transport", "government", "shopping", "home_services", "labor",
] as const;
export const ROUTE_BASED_CATEGORIES = REQUEST_CATEGORIES;
export const SINGLE_LOCATION_CATEGORIES = [] as const;

export function isRouteBasedCategory(category: string): boolean {
  return (ROUTE_BASED_CATEGORIES as readonly string[]).includes(category);
}

export type RequestLocationInput = {
  category: string;
  area?: string | null;
  fromArea?: string | null;
  toArea?: string | null;
  fromGovernorate?: string | null;
  toGovernorate?: string | null;
};

export type NormalizedRequestLocation = {
  area: string;
  fromArea: string | null;
  toArea: string | null;
  fromGovernorate: string | null;
  toGovernorate: string | null;
};

export type RequestLocationValidation =
  | { success: true; data: NormalizedRequestLocation }
  | { success: false; field: "category" | "area" | "fromArea" | "toArea" | "fromGovernorate" | "toGovernorate" };

export function normalizeNewRequestLocation(input: RequestLocationInput): RequestLocationValidation {
  if (!(REQUEST_CATEGORIES as readonly string[]).includes(input.category)) {
    return { success: false, field: "category" };
  }

  const hasRouteFields = input.fromArea !== undefined || input.toArea !== undefined;
  if (!hasRouteFields) {
    // Keep already-published clients working while new clients send structured routes.
    if (!isActiveServiceArea(input.area)) return { success: false, field: "area" };
    return {
      success: true,
      data: { area: input.area, fromArea: null, toArea: null, fromGovernorate: null, toGovernorate: null },
    };
  }

  if (!isActiveServiceArea(input.fromArea)) return { success: false, field: "fromArea" };
  if (!isActiveServiceArea(input.toArea)) return { success: false, field: "toArea" };
  const hasFromGovernorate = input.fromGovernorate !== undefined && input.fromGovernorate !== null;
  const hasToGovernorate = input.toGovernorate !== undefined && input.toGovernorate !== null;
  if (hasFromGovernorate && !isValidGovernorateLocation(input.fromGovernorate, input.fromArea)) {
    return { success: false, field: "fromGovernorate" };
  }
  if (hasToGovernorate && !isValidGovernorateLocation(input.toGovernorate, input.toArea)) {
    return { success: false, field: "toGovernorate" };
  }
  if (hasFromGovernorate !== hasToGovernorate) {
    return { success: false, field: hasFromGovernorate ? "toGovernorate" : "fromGovernorate" };
  }
  return {
    success: true,
    data: {
      area: input.fromArea,
      fromArea: input.fromArea,
      toArea: input.toArea,
      fromGovernorate: input.fromGovernorate ?? null,
      toGovernorate: input.toGovernorate ?? null,
    },
  };
}

export type RequestLocationRecord = {
  category: string;
  area: string;
  fromArea?: string | null;
  toArea?: string | null;
};

export function requestMatchesAreaFilter(request: RequestLocationRecord, selectedAreas: readonly string[]): boolean {
  if (!isRouteBasedCategory(request.category)) return selectedAreas.includes(request.area);
  return selectedAreas.includes(request.fromArea ?? request.area)
    || selectedAreas.includes(request.toArea ?? "");
}

/**
 * Location filter shared by helper feeds and admin area filters. Legacy route
 * rows have no from_area, so their unchanged area value remains the fallback.
 */