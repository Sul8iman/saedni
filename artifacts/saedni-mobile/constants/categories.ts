export const CATEGORIES = [
  { value: "transport",     label: "نقل وتحميل",        icon: "car-outline"            },
  { value: "delivery",      label: "مشاوير وتوصيل",    icon: "navigate-circle-outline" },
  { value: "government",    label: "معاملات ومراجعات", icon: "document-text-outline"   },
  { value: "shopping",      label: "شراء أغراض",        icon: "bag-outline"             },
  { value: "home_services", label: "خدمات منزلية",      icon: "hammer-outline"          },
  { value: "labor",         label: "أخرى",              icon: "grid-outline"            },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const AREAS = [
  "مسقط", "بوشر", "الخوير", "الغبرة", "الموالح",
  "السيب", "العامرات",
  "المعبيلة", "الخوض", "الأنصب", "العذيبة", "القرم", "غلا", "روي",
  "صور", "صحار", "نزوى", "صلالة", "أخرى",
];

export const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: "نشط",    color: "#15803D", bg: "#DCFCE7" },
  accepted:    { label: "مقبول",  color: "#1D4ED8", bg: "#DBEAFE" },
  in_progress: { label: "جارٍ",   color: "#7C3AED", bg: "#EDE9FE" },
  completed:   { label: "منتهي", color: "#6B7280", bg: "#F3F4F6" },
  cancelled:   { label: "ملغي",  color: "#DC2626", bg: "#FEE2E2" },
};
