import { useParams } from "wouter";
import { ArrowRight, MapPin, Clock, Banknote, User } from "lucide-react";
import { useGetRequest, getGetRequestQueryKey } from "@workspace/api-client-react";
import { CATEGORY_MAP, STATUS_MAP } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const requestId = parseInt(id, 10);

  const { data: req, isLoading } = useGetRequest(requestId, {
    query: { enabled: !!requestId, queryKey: getGetRequestQueryKey(requestId) },
  });

  if (isLoading) {
    return (
      <div className="app-container bg-background px-4 pt-12 pb-nav" dir="rtl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="app-container bg-background px-4 pt-12 text-center" dir="rtl">
        <p className="text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  const cat = CATEGORY_MAP[req.category] ?? { label: req.category, icon: "HelpCircle" };
  const status = STATUS_MAP[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="text-muted-foreground" data-testid="btn-back">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">تفاصيل الطلب</h1>
      </div>

      <div className="px-4 py-5 pb-nav space-y-4">
        {/* Category & Status */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CategoryIcon iconName={cat.icon} className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-primary">{cat.label}</span>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed" data-testid="request-details-text">{req.details}</p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
            <MapPin className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">المنطقة</p>
            <p className="font-semibold text-sm mt-0.5">{req.area}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
            <Clock className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">الوقت</p>
            <p className="font-semibold text-sm mt-0.5">
              {req.timeType === "now" ? "الآن" : req.scheduledDateTime ?? "مجدول"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
            <Banknote className="w-4 h-4 text-green-600 mb-1" />
            <p className="text-xs text-muted-foreground">المبلغ</p>
            <p className="font-bold text-green-600 text-lg mt-0.5">{req.offeredAmount} ر.ع.</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
            <User className="w-4 h-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">الطالب</p>
            <p className="font-semibold text-sm mt-0.5">{req.customerName ?? "—"}</p>
          </div>
        </div>

        {/* Helper info if accepted */}
        {req.helperId && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">المساعد</p>
            <p className="text-blue-700">{req.helperName ?? "—"}</p>
            <p className="text-xs text-blue-600 mt-1">سيتم عرض بيانات التواصل بعد التأكيد</p>
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-xs">
          <p className="text-sm font-semibold mb-3">حالة الطلب</p>
          {["available", "accepted", "in_progress", "completed"].map((s, i) => {
            const steps = ["available", "accepted", "in_progress", "completed"];
            const currentIdx = steps.indexOf(req.status);
            const stepIdx = steps.indexOf(s);
            const isActive = stepIdx <= currentIdx && req.status !== "cancelled";
            const labels: Record<string, string> = {
              available: "منشور",
              accepted: "تم القبول",
              in_progress: "قيد التنفيذ",
              completed: "مكتمل",
            };
            return (
              <div key={s} className={`flex items-center gap-3 ${i < 3 ? "mb-3" : ""}`} data-testid={`status-step-${s}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isActive ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-sm ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {labels[s]}
                </span>
              </div>
            );
          })}
          {req.status === "cancelled" && (
            <div className="flex items-center gap-3 text-destructive" data-testid="status-step-cancelled">
              <div className="w-3 h-3 rounded-full bg-destructive flex-shrink-0" />
              <span className="text-sm font-semibold">ملغي</span>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
