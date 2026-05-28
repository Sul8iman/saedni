import { useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldOff, User, Star } from "lucide-react";
import {
  useListUsers,
  getListUsersQueryKey,
  useVerifyHelper,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const USER_TYPE_LABELS: Record<string, string> = {
  customer: "طالب مساعدة",
  helper: "مساعد",
  admin: "مدير",
};

export default function UsersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: helpers, isLoading } = useListUsers(
    { userType: "helper" },
    { query: { queryKey: getListUsersQueryKey({ userType: "helper" }) } }
  );

  const verifyMutation = useVerifyHelper();

  const handleAction = (id: number, action: "verify" | "block") => {
    verifyMutation.mutate(
      { id, data: { action } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: action === "verify" ? "تم توثيق الحساب" : "تم حظر الحساب" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل تنفيذ العملية", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">إدارة المساعدين</h1>
        <p className="text-muted-foreground text-sm">توثيق وحظر الحسابات</p>
      </div>

      <div className="px-4 py-5 pb-nav space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}

        {!isLoading && (!helpers || helpers.length === 0) && (
          <div className="text-center py-12 text-muted-foreground" data-testid="empty-helpers">
            لا يوجد مساعدون مسجلون
          </div>
        )}

        {helpers?.map((helper) => (
          <div key={helper.id} className="bg-white rounded-2xl border border-border p-4 shadow-xs" data-testid={`helper-card-${helper.id}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{helper.name}</p>
                  {helper.isVerified && !helper.isBlocked && (
                    <span className="text-xs text-green-600 flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> موثق
                    </span>
                  )}
                  {helper.isBlocked && (
                    <span className="text-xs text-destructive flex items-center gap-0.5">
                      <ShieldOff className="w-3 h-3" /> محظور
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{helper.phone}</p>
                {helper.area && <p className="text-xs text-muted-foreground">{helper.area}</p>}
                {helper.rating != null && (
                  <p className="text-xs text-yellow-600 flex items-center gap-0.5 mt-0.5">
                    <Star className="w-3 h-3" /> {helper.rating.toFixed(1)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {!helper.isVerified && !helper.isBlocked && (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs rounded-lg"
                  onClick={() => handleAction(helper.id, "verify")}
                  disabled={verifyMutation.isPending}
                  data-testid={`btn-verify-${helper.id}`}
                >
                  <Shield className="w-3 h-3 ml-1" />
                  توثيق
                </Button>
              )}
              {!helper.isBlocked && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs rounded-lg text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => handleAction(helper.id, "block")}
                  disabled={verifyMutation.isPending}
                  data-testid={`btn-block-${helper.id}`}
                >
                  <ShieldOff className="w-3 h-3 ml-1" />
                  حظر
                </Button>
              )}
              {helper.isBlocked && (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs rounded-lg"
                  onClick={() => handleAction(helper.id, "verify")}
                  disabled={verifyMutation.isPending}
                  data-testid={`btn-unblock-${helper.id}`}
                >
                  <Shield className="w-3 h-3 ml-1" />
                  رفع الحظر
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
