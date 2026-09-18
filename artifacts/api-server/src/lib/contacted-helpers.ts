export type ContactMethod = "phone" | "whatsapp";

export interface ContactedHelperContactRecord {
  helperId: number | null;
  helperNameSnapshot: string | null;
  contactMethod: ContactMethod;
  firstContactedAt: Date;
  lastContactedAt: Date;
}

export interface ContactedHelperProfile {
  name: string;
  phone: string;
  rating: number | null;
}

export interface ContactedHelperRating {
  average: number | string | null;
  count: number | string | null;
}

export function presentContactedHelper(
  contact: ContactedHelperContactRecord,
  helper: ContactedHelperProfile | undefined,
  aggregate: ContactedHelperRating | undefined,
) {
  if (contact.helperId !== null && (!helper || !helper.phone)) {
    throw new Error(`Contacted helper ${contact.helperId} has no current account phone`);
  }

  return {
    helperId: contact.helperId,
    helperName: helper?.name ?? contact.helperNameSnapshot ?? null,
    helperPhone: helper?.phone ?? null,
    rating: aggregate?.average == null ? helper?.rating ?? null : Number(aggregate.average),
    ratingCount: Number(aggregate?.count ?? 0),
    contactMethod: contact.contactMethod,
    contactedAt: contact.lastContactedAt.toISOString(),
    firstContactedAt: contact.firstContactedAt.toISOString(),
    lastContactedAt: contact.lastContactedAt.toISOString(),
  };
}