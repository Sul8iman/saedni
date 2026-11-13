export type GuestIntent = "customer" | "helper";

export function normalizeGuestIntent(value: unknown): GuestIntent | null {
  return value === "customer" || value === "helper" ? value : null;
}

export function getPostAuthDestination(
  intent: GuestIntent | null,
  roles: readonly string[],
): { path: "/" | "/(customer)" | "/(helper)"; role: GuestIntent | null } {
  if (intent && roles.includes(intent)) {
    return { path: intent === "customer" ? "/(customer)" : "/(helper)", role: intent };
  }
  return { path: "/", role: null };
}
