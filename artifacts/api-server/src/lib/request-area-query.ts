import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { requestsTable } from "@workspace/db";
import { ROUTE_BASED_CATEGORIES } from "./request-locations";

/**
 * Location filter shared by helper feeds and admin area filters. Legacy route
 * rows have no from_area, so their unchanged area value remains the fallback.
 */
export function buildRequestAreaCondition(selectedAreas: string[]) {
  if (selectedAreas.length === 0) return eq(requestsTable.id, -1);

  const routeLocations = and(
    inArray(requestsTable.category, [...ROUTE_BASED_CATEGORIES]),
    or(
      inArray(requestsTable.fromArea, selectedAreas),
      inArray(requestsTable.toArea, selectedAreas),
      and(isNull(requestsTable.fromArea), inArray(requestsTable.area, selectedAreas)),
    ),
  );
  return routeLocations!;
}