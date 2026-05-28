import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, MapPin, Clock, Banknote, Phone, MessageCircle, User } from "lucide-react";
import {
  useListRequests,
  getListRequestsQueryKey,
  useUpdateRequestStatus,
  type HelpRequest,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Arabic status labels for the helper's own requests
const HELPER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  accepted:    { label: "مقبولة",       color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "قيد التنفيذ",  color: "bg-yellow-100 text-yellow-700" },
  completed:   { label: "مكتملة",       color: "bg-green-100 text-green-700" },
  cancelled:   { label: "ملغية",        color: "bg-red-100 text-red-700" },
};

export default function HelperMyRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all requests assigned to this helper
  const { data: requests, isLoading } = useListRequests(
    { helperId: user?.id },
    { query: { enabled: !!user, queryKey: getListRequestsQueryKey({ helperId: user?.id }) } }
  );

  const statusMutation = useUpdateRequestStatus();

  // Update request status (in_progress or completed)
  const handleStatus = (id: number, status: "in_progress" | "completed" | "cancelled") => {
    statusMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ helperId: user?.id }) });
          const msgs: Record<string, string> = {
            in_progress: "تم بدء تنفيذ الطلب",
            completed:   "تم إنهاء الطلب بنجاح",
            cancelled:   "تم إلغاء الطلب",
          };
          toast({ title: msgs[status] ?? "تم التحديث" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
        },
      }
    );
  };

  const handleWhatsApp = (phone: string) => {
    const msg = encodeURIComponent("مرحباً، بخصوص طلبك في ساعدني");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  // Split requests into current (accepted/in_progress) and past (completed/cancelled)
  const current = requests?.filter((r) => r.status === "accepted" || r.status === "in_progress") ?? [];
  const past    = requests?.filter((r) => r.status === "completed" || r.status === "cancelled") ?? [];

  const RequestCard = ({ req }: { req: HelpRequest }) => {
    const cat    = CATEGORY_MAP[req.category] ?? { label: req.category, icon: "HelpCircle" };
    const status = HELPER_STATUS_LABEL[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
    const isCurrent = req.status === "accepted" || req.status === "in_progress";

    return (
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden" data-testid={`helper-req-${req.id}`}>
        {/* Card header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary">{cat.label}</span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>

          <p className="text-sm text-foreground mb-3 leading-relaxed line-clamp-2">{req.details}</p>

          {/* Request meta */}
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

          {/* Customer info */}
          {req.customerName && (
            <div className="bg-muted/40 rounded-xl px-3 py-2 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {req.customerName}
              </div>
              {req.customerPhone && (
                <div className="flex items-center gap-1.5 text-muted-foreground" dir="ltr">
                  <Phone className="w-3.5 h-3.5" />
                  {req.customerPhone}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons — only for current (active) requests */}
        {isCurrent && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            {/* Communication buttons */}
            {req.customerPhone && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleWhatsApp(req.customerPhone!)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors flex-1 justify-center"
                  data-testid={`btn-whatsapp-helper-${req.id}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  مراسلة العميل
                </button>
                <button
                  onClick={() => handleCall(req.customerPhone!)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors flex-1 justify-center"
                  data-testid={`btn-call-helper-${req.id}`}
                >
                  <Phone className="w-4 h-4" />
                  اتصال
                </button>
              </div>
            )}

            {/* Status progression buttons */}
            <div className="flex gap-2">
              {req.status === "accepted" && (
                <Button
                  className="flex-1 rounded-xl h-9 text-xs bg-yellow-500 hover:bg-yellow-600"
                  onClick={() => handleStatus(req.id, "in_progress")}
                  disabled={statusMutation.isPending}
                  data-testid={`btn-start-${req.id}`}
                >
                  بدء التنفيذ
                </Button>
              )}
              {req.status === "in_progress" && (
                <Button
                  className="flex-1 rounded-xl h-9 text-xs"
                  onClick={() => handleStatus(req.id, "completed")}
                  disabled={statusMutation.isPending}
                  data-testid={`btn-complete-${req.id}`}
                >
                  إنهاء الطلب
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">طلباتي</h1>
        <p className="text-muted-foreground text-sm mt-0.5">الطلبات التي قبلتها</p>
      </div>

      <div className="px-4 py-4 pb-nav space-y-6">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}

        {!isLoading && requests?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground" data-testid="empty-helper-requests">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p>لم تقبل أي طلبات بعد</p>
          </div>
        )}

        {/* Current requests */}
        {current.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-3">الطلبات الحالية</h2>
            <div className="space-y-3">
              {current.map((req) => <RequestCard key={req.id} req={req} />)}
            </div>
          </section>
        )}

        {/* Past requests */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-muted-foreground mb-3">الطلبات السابقة</h2>
            <div className="space-y-3">
              {past.map((req) => <RequestCard key={req.id} req={req} />)}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
