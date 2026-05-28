export const CATEGORIES = [
  { value: "transport",     label: "نقل وتحميل",        icon: "car-sport-outline"       },
  { value: "delivery",      label: "مشاوير وتوصيل",    icon: "bicycle-outline"          },
  { value: "government",    label: "معاملات ومراجعات", icon: "document-text-outline"    },
  { value: "shopping",      label: "شراء أغراض",        icon: "bag-handle-outline"       },
  { value: "home_services", label: "خدمات منزلية",      icon: "home-outline"             },
  { value: "labor",         label: "أخرى",              icon: "ellipsis-horizontal"      },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const AREAS = [
  "مسقط", "بوشر", "الخوير", "الغبرة", "الموالح",
  "السيب", "العامرات", "صور", "صحار", "نزوى", "صلالة", "أخرى",
];

export const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: "نشط",    color: "#15803D", bg: "#DCFCE7" },
  accepted:    { label: "نشط",    color: "#15803D", bg: "#DCFCE7" },
  in_progress: { label: "جارٍ",   color: "#1D4ED8", bg: "#DBEAFE" },
  completed:   { label: "منتهي", color: "#6B7280", bg: "#F3F4F6" },
  cancelled:   { label: "ملغي",  color: "#DC2626", bg: "#FEE2E2" },
};
