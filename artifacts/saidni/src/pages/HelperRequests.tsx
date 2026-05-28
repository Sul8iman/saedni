import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, MapPin, Clock, Banknote } from "lucide-react";
import {
  useListRequests,
  getListRequestsQueryKey,
  useAcceptRequest,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, CATEGORY_MAP, AREAS } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HelperRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [acceptedId, setAcceptedId] = useState<number | null>(null);

  const params: Record<string, string | number> = { status: "available" };
  if (filterCategory && filterCategory !== "all") params.category = filterCategory;
  if (filterArea && filterArea !== "all") params.area = filterArea;

  const { data: requests, isLoading } = useListRequests(params, {
    query: { queryKey: getListRequestsQueryKey(params) },
  });

  const acceptMutation = useAcceptRequest();

  const handleAccept = (id: number) => {
    if (!user) return;
    acceptMutation.mutate(
      { id, data: { helperId: user.id } },
      {
        onSuccess: () => {
          setAcceptedId(id);
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          toast({ title: "تم قبول الطلب", description: "سيتم عرض بيانات التواصل بعد التأكيد" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل قبول الطلب، ربما تم قبوله من قبل شخص آخر", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">الطلبات المتاحة</h1>
        <p className="text-muted-foreground text-sm mt-0.5">اختر طلباً وابدأ الكسب</p>
      </div>

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

      <div className="px-4 py-4 pb-nav space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}

        {!isLoading && (!requests || requests.length === 0) && (
          <div className="text-center py-16 text-muted-foreground" data-testid="empty-requests">
            لا يوجد طلبات متاحة الآن
          </div>
        )}

        {requests?.map((req) => {
          const cat = CATEGORY_MAP[req.category] ?? { label: req.category, icon: "HelpCircle" };
          const isJustAccepted = acceptedId === req.id;
          return (
            <div key={req.id} className="bg-white rounded-2xl border border-border p-4 shadow-xs" data-testid={`request-card-${req.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary">{cat.label}</span>
              </div>

              <Link href={`/request/${req.id}`}>
                <p className="text-sm text-foreground mb-3 cursor-pointer hover:text-primary transition-colors">{req.details}</p>
              </Link>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {req.area}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {req.timeType === "now" ? "الآن" : req.scheduledDateTime ?? "مجدول"}
                </span>
                <span className="flex items-center gap-1 font-bold text-green-600">
                  <Banknote className="w-3 h-3" />
                  {req.offeredAmount} ر.ع.
                </span>
              </div>

              {isJustAccepted ? (
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2" data-testid={`accepted-msg-${req.id}`}>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-700">تم القبول — سيتم عرض بيانات التواصل بعد التأكيد</p>
                </div>
              ) : (
                <Button
                  className="w-full rounded-xl h-10"
                  onClick={() => handleAccept(req.id)}
                  disabled={acceptMutation.isPending}
                  data-testid={`btn-accept-${req.id}`}
                >
                  قبول الطلب
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
