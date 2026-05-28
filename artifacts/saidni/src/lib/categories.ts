// Category definitions for ساعدني

export const CATEGORIES = [
  { value: "transport", label: "نقل وتحميل", icon: "Truck" },
  { value: "delivery", label: "مشاوير وتوصيل", icon: "Car" },
  { value: "government", label: "معاملات ومراجعات", icon: "FileText" },
  { value: "shopping", label: "شراء أغراض", icon: "ShoppingBag" },
  { value: "home_services", label: "خدمات منزلية", icon: "Wrench" },
  { value: "labor", label: "عمالة ومساعدة", icon: "HardHat" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_MAP: Record<string, { label: string; icon: string }> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, { label: c.label, icon: c.icon }])
);

export const AREAS = [
  "مسقط",
  "بوشر",
  "الخوير",
  "الغبرة",
  "الموالح",
  "السيب",
  "العامرات",
  "صور",
  "صحار",
  "نزوى",
  "صلالة",
  "أخرى",
];

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  available:   { label: "منشور",       color: "bg-green-100 text-green-700" },
  accepted:    { label: "منشور",       color: "bg-green-100 text-green-700" },
  in_progress: { label: "قيد التنفيذ", color: "bg-yellow-100 text-yellow-700" },
  completed:   { label: "مكتمل",      color: "bg-gray-100 text-gray-700" },
  cancelled:   { label: "ملغي",        color: "bg-red-100 text-red-700" },
};
