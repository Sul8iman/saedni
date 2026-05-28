import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardList } from "lucide-react";
import {
  useListRequests,
  getListRequestsQueryKey,
  useCancelRequest,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Customer-visible status labels (simplified MVP)
const CUSTOMER_STATUS: Record<string, { label: string; color: string }> = {
  available:   { label: "منشور",  color: "bg-green-100 text-green-700" },
  cancelled:   { label: "ملغي",   color: "bg-red-100 text-red-700" },
  accepted:    { label: "منشور",  color: "bg-green-100 text-green-700" },
  in_progress: { label: "منشور",  color: "bg-green-100 text-green-700" },
  completed:   { label: "مكتمل", color: "bg-gray-100 text-gray-700" },
};

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
          const status = CUSTOMER_STATUS[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
          const canCancel = req.status === "available";

          return (
            <Link key={req.id} href={`/request/${req.id}`}>
              <div
                className="bg-white rounded-2xl border border-border p-4 shadow-xs hover:shadow-sm transition-shadow cursor-pointer"
                data-testid={`request-card-${req.id}`}
              >
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

                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={(e) => { e.preventDefault(); handleCancel(req.id); }}
                    disabled={cancelMutation.isPending}
                    data-testid={`btn-cancel-${req.id}`}
                  >
                    إلغاء الطلب
                  </Button>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
