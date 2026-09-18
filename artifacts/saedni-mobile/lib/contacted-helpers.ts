export type ContactMethod = "phone" | "whatsapp";

export interface ContactedHelper {
  helperId: number | null;
  helperName?: string | null;
  helperPhone: string | null;
  rating?: number | null;
  ratingCount: number;
  contactMethod: ContactMethod;
  contactedAt: string;
  firstContactedAt?: string;
  lastContactedAt?: string;
}

export function dedupeContactedHelpers(helpers: readonly ContactedHelper[]): ContactedHelper[] {
  const latestByHelperId = new Map<number, ContactedHelper>();
  const deletedHelpers: ContactedHelper[] = [];

  for (const helper of helpers) {
    if (helper.helperId === null) {
      deletedHelpers.push(helper);
      continue;
    }

    const existing = latestByHelperId.get(helper.helperId);
    if (
      !existing ||
      new Date(helper.contactedAt).getTime() >= new Date(existing.contactedAt).getTime()
    ) {
      latestByHelperId.set(helper.helperId, helper);
    }
  }

  return [...latestByHelperId.values(), ...deletedHelpers];
}