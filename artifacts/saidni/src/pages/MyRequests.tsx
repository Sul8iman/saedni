import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardList, Phone, MessageCircle, User } from "lucide-react";
import {
  useListRequests,
  getListRequestsQueryKey,
  useCancelRequest,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP, STATUS_MAP } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useListRequests(
    { customerId: user?.id },
    { query: { enabled: !!user, queryKey: getListRequestsQueryKey({ customerId: user?.id }) } }
  );

  const cancelMutation = useCancelRequest();

  const handleCancel = (id: number) => {
    cancelMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ customerId: user?.id }) });
          toast({ title: "تم إلغاء الطلب" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل إلغاء الطلب", variant: "destructive" });
        },
      }
    );
  };

  const handleWhatsApp = (phone: string) => {
    const msg = encodeURIComponent("مرحباً بخصوص طلبي في ساعدني");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  // Has an active helper been assigned?
  const hasHelper = (req: { status: string; helperId?: number | null }) =>
    req.helperId !== null && ["accepted", "in_progress", "completed"].includes(req.status);

  // Arabic status labels for customer view
  const CUSTOMER_STATUS_LABEL: Record<string, string> = {
    accepted:    "مقبولة",
    in_progress: "قيد التنفيذ",
    completed:   "مكتملة",
  };

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">طلباتي</h1>
        <p className="text-muted-foreground text-sm mt-0.5">متابعة حالة طلباتك</p>
      </div>

      <div className="px-4 py-5 pb-nav space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}

        {!isLoading && (!requests || requests.length === 0) && (
          <div className="text-center py-16" data-testid="empty-requests">
            <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لا يوجد طلبات بعد</p>
            <Link href="/customer">
              <Button variant="link" className="text-primary mt-2">إنشاء طلب جديد</Button>
            </Link>
          </div>
        )}

        {requests?.map((req) => {
          const cat    = CATEGORY_MAP[req.category] ?? { label: req.category, icon: "HelpCircle" };
          const status = STATUS_MAP[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
          const helperAssigned = hasHelper(req);

          return (
            <div key={req.id} className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden" data-testid={`request-card-${req.id}`}>
              {/* Clickable main area */}
              <Link href={`/request/${req.id}`}>
                <div className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
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
                  <p className="text-sm text-foreground line-clamp-2 mb-2">{req.details}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{req.area}</span>
                      <span>{req.timeType === "now" ? "الآن" : req.scheduledDateTime ?? "مجدول"}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">{req.offeredAmount} ر.ع.</span>
                  </div>
                </div>
              </Link>

              {/* Helper details — shown when a helper has been assigned */}
              {helperAssigned && req.helperName && (
                <div className="border-t border-border px-4 py-3 bg-blue-50/50 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 mb-1">تم قبول طلبك</p>

                  {/* Helper info */}
                  <div className="bg-white rounded-xl px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {req.helperName}
                    </div>
                    {req.helperPhone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground" dir="ltr">
                        <Phone className="w-3.5 h-3.5" />
                        {req.helperPhone}
                      </div>
                    )}
                    <div className="pt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        req.status === "completed" ? "bg-green-100 text-green-700" :
                        req.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        حالة الطلب: {CUSTOMER_STATUS_LABEL[req.status] ?? req.status}
                      </span>
                    </div>
                  </div>

                  {/* Contact helper buttons */}
                  {req.helperPhone && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWhatsApp(req.helperPhone!)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors flex-1 justify-center"
                        data-testid={`btn-wa-helper-${req.id}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        مراسلة المساعد
                      </button>
                      <button
                        onClick={() => handleCall(req.helperPhone!)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors flex-1 justify-center"
                        data-testid={`btn-call-helper-${req.id}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        اتصال بالمساعد
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cancel — only for available (not yet accepted) requests */}
              {req.status === "available" && (
                <div className="border-t border-border px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => handleCancel(req.id)}
                    disabled={cancelMutation.isPending}
                    data-testid={`btn-cancel-${req.id}`}
                  >
                    إلغاء الطلب
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
