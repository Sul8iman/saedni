import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ClipboardList, MapPin, Clock, Banknote, Calendar } from "lucide-react";
import {
  useListRequests,
  getListRequestsQueryKey,
  useUpdateRequest,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-OM", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MyRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useListRequests(
    { customerId: user?.id },
    { query: { enabled: !!user, queryKey: getListRequestsQueryKey({ customerId: user?.id }) } }
  );

  const updateMutation = useUpdateRequest();

  const handleEnd = (id: number) => {
    updateMutation.mutate(
      { id, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey({ customerId: user?.id }) });
          toast({ title: "تم إنهاء الطلب" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل إنهاء الطلب", variant: "destructive" });
        },
      }
    );
  };

  const isActive = (status: string) => status !== "completed" && status !== "cancelled";

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">طلباتي</h1>
        <p className="text-muted-foreground text-sm mt-0.5">طلباتك المنشورة</p>
      </div>

      <div className="px-4 py-5 pb-nav space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
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
          const active = isActive(req.status);

          return (
            <div
              key={req.id}
              className={`bg-white rounded-2xl border border-border shadow-xs overflow-hidden ${!active ? "opacity-60" : ""}`}
              data-testid={`request-card-${req.id}`}
            >
              <div className="px-4 pt-4 pb-3">
                {/* Category */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-primary">{cat.label}</span>
                </div>

                {/* Details */}
                <p className="text-sm text-foreground leading-relaxed mb-3">{req.details}</p>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {req.area}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-green-700">
                    <Banknote className="w-3 h-3 flex-shrink-0" />
                    {req.offeredAmount} ر.ع.
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {req.timeType === "now" ? "الآن" : req.scheduledDateTime ?? "مجدول"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    {formatDate(req.createdAt)}
                  </span>
                </div>
              </div>

              {/* إنهاء الطلب — only for active requests */}
              {active && (
                <div className="border-t border-border px-4 py-3">
                  <Button
                    className="w-full rounded-xl h-9 text-sm bg-gray-700 hover:bg-gray-800 text-white"
                    onClick={() => handleEnd(req.id)}
                    disabled={updateMutation.isPending}
                    data-testid={`btn-end-${req.id}`}
                  >
                    إنهاء الطلب
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
