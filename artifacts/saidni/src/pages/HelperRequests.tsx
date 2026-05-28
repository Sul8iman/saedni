import { Phone, MessageCircle, MapPin, Clock, Banknote, User, ShieldOff } from "lucide-react";
import { useListRequests, getListRequestsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, CATEGORY_MAP, AREAS } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function HelperRequests() {
  const { user } = useAuth();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");

  const isBlocked = user?.isActive === false;

  const params: Record<string, string | number> = { status: "available" };
  if (filterCategory && filterCategory !== "all") params.category = filterCategory;
  if (filterArea && filterArea !== "all") params.area = filterArea;

  // Skip the request entirely if the helper is blocked
  const { data: requests, isLoading } = useListRequests(params, {
    query: {
      queryKey: getListRequestsQueryKey(params),
      enabled: !isBlocked,
    },
  });

  const handleWhatsApp = (phone: string) => {
    const msg = encodeURIComponent("مرحباً، بخصوص طلبك في ساعدني");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  return (
    <div className="app-container bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">الطلبات الحالية</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          تواصل مباشرة مع طالب الخدمة عبر الواتساب أو الاتصال
        </p>
      </div>

      {/* ── Blocked screen ── */}
      {isBlocked ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center" data-testid="helper-blocked-screen">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-5">
            <ShieldOff className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">تم تعطيل حسابك</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            تم تعطيل حسابك، يرجى التواصل مع الإدارة
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="px-4 py-3 bg-white border-b border-border flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="flex-1 h-9 text-xs rounded-xl" data-testid="filter-category">
                <SelectValue placeholder="كل التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="flex-1 h-9 text-xs rounded-xl" data-testid="filter-area">
                <SelectValue placeholder="كل المناطق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المناطق</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Request list */}
          <div className="px-4 py-4 pb-nav space-y-3">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}

            {!isLoading && (!requests || requests.length === 0) && (
              <div className="text-center py-16 text-muted-foreground" data-testid="empty-requests">
                لا يوجد طلبات متاحة الآن
              </div>
            )}

            {requests?.map((req) => {
              const cat = CATEGORY_MAP[req.category] ?? { label: req.category, icon: "HelpCircle" };

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden"
                  data-testid={`request-card-${req.id}`}
                >
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-primary">{cat.label}</span>
                    </div>

                    <p className="text-sm text-foreground mb-3 leading-relaxed">{req.details}</p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {req.area}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.timeType === "now" ? "الآن" : req.scheduledDateTime ?? "مجدول"}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-green-600 text-sm">
                        <Banknote className="w-3.5 h-3.5" />
                        {req.offeredAmount} ر.ع.
                      </span>
                    </div>

                    {(req.customerName || req.customerPhone) && (
                      <div className="bg-muted/40 rounded-xl px-3 py-2 text-xs space-y-1">
                        {req.customerName && (
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            {req.customerName}
                          </div>
                        )}
                        {req.customerPhone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono" dir="ltr">
                            <Phone className="w-3.5 h-3.5" />
                            {req.customerPhone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {req.customerPhone && (
                    <div className="border-t border-border px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleWhatsApp(req.customerPhone!)}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 active:bg-green-200 transition-colors flex-1 justify-center"
                        data-testid={`btn-whatsapp-${req.id}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        مراسلة
                      </button>
                      <button
                        onClick={() => handleCall(req.customerPhone!)}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors flex-1 justify-center"
                        data-testid={`btn-call-${req.id}`}
                      >
                        <Phone className="w-4 h-4" />
                        اتصال
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
