import { useQueryClient } from "@tanstack/react-query";
import { Users, ClipboardList, CheckCircle, XCircle, Activity } from "lucide-react";
import {
  useGetAdminStats,
  getGetAdminStatsQueryKey,
  useListRequests,
  getListRequestsQueryKey,
  useDeleteRequest,
  useUpdateRequest,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP, STATUS_MAP } from "@/lib/categories";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() },
  });

  const { data: requests, isLoading: requestsLoading } = useListRequests(undefined, {
    query: { queryKey: getListRequestsQueryKey() },
  });

  const deleteMutation = useDeleteRequest();
  const updateMutation = useUpdateRequest();

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          toast({ title: "تم حذف الطلب" });
        },
      }
    );
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          toast({ title: "تم تحديث الحالة" });
        },
      }
    );
  };

  const statCards = [
    { label: "إجمالي المستخدمين", value: stats?.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "المساعدون", value: stats?.totalHelpers, icon: Users, color: "text-teal-600 bg-teal-50" },
    { label: "طالبو المساعدة", value: stats?.totalCustomers, icon: Users, color: "text-purple-600 bg-purple-50" },
    { label: "إجمالي الطلبات", value: stats?.totalRequests, icon: ClipboardList, color: "text-primary bg-primary/10" },
    { label: "الطلبات النشطة", value: stats?.activeRequests, icon: Activity, color: "text-orange-600 bg-orange-50" },
    { label: "المكتملة", value: stats?.completedRequests, icon: CheckCircle, color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm">إدارة المنصة</p>
      </div>

      <div className="px-4 py-5 pb-nav space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-3 shadow-xs text-center" data-testid={`stat-card-${i}`}>
              {statsLoading ? (
                <Skeleton className="h-7 w-10 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold">{s.value ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground leading-tight mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Requests management */}
        <div>
          <h2 className="text-base font-bold mb-3">إدارة الطلبات</h2>
          {requestsLoading && <Skeleton className="h-32 w-full rounded-2xl" />}
          <div className="space-y-2">
            {requests?.map((req) => {
              const cat = CATEGORY_MAP[req.category] ?? { label: req.category, icon: "HelpCircle" };
              const status = STATUS_MAP[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-border p-3 shadow-xs" data-testid={`admin-request-${req.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs font-semibold text-primary">{cat.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{req.details}</p>
                      <p className="text-xs text-muted-foreground">{req.area} · {req.offeredAmount} ر.ع.</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Select value={req.status} onValueChange={(v) => handleStatusChange(req.id, v)}>
                      <SelectTrigger className="flex-1 h-8 text-xs rounded-lg" data-testid={`status-select-${req.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">متاح</SelectItem>
                        <SelectItem value="accepted">تم القبول</SelectItem>
                        <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 rounded-lg px-2"
                      onClick={() => handleDelete(req.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`btn-delete-request-${req.id}`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
