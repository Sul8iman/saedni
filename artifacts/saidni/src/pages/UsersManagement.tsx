import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Shield, ShieldOff, User, Star, Phone, MapPin, Calendar, Clock, Trash2, KeyRound } from "lucide-react";
import {
  useListUsers,
  getListUsersQueryKey,
  useVerifyHelper,
  useGetUser,
  getGetUserQueryKey,
  useListRequests,
  getListRequestsQueryKey,
  useDeleteUser,
  type User as UserType,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP, STATUS_MAP } from "@/lib/categories";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const USER_TYPE_LABELS: Record<string, string> = {
  customer: "طالب مساعدة",
  helper: "مساعد",
  admin: "مدير",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── User Detail Panel ────────────────────────────────────────────────────────
function UserDetail({ userId, onBack }: { userId: number; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetUser(userId, {
    query: { queryKey: getGetUserQueryKey(userId) },
  });

  const { data: allRequests } = useListRequests(
    { customerId: userId },
    { query: { queryKey: getListRequestsQueryKey({ customerId: userId }) } }
  );

  const verifyMutation = useVerifyHelper();
  const deleteMutation = useDeleteUser();

  const currentRequests = allRequests?.filter((r) => ["available", "accepted", "in_progress"].includes(r.status)) ?? [];
  const pastRequests = allRequests?.filter((r) => ["completed", "cancelled"].includes(r.status)) ?? [];

  const handleAction = (action: "verify" | "block") => {
    if (!user) return;
    verifyMutation.mutate(
      { id: user.id, data: { action } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: action === "verify" ? "تم توثيق الحساب" : "تم حظر الحساب" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!user) return;
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) return;
    deleteMutation.mutate(
      { id: user.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "تم حذف المستخدم" });
          onBack();
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل حذف المستخدم", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" data-testid="btn-back-users">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">تفاصيل المستخدم</h1>
      </div>

      <div className="px-4 py-5 pb-nav space-y-4">
        {/* Avatar & name */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-xs text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold">{user.name}</h2>
          <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
            {USER_TYPE_LABELS[user.userType] ?? user.userType}
          </span>
          <div className="flex items-center justify-center gap-3 mt-2">
            {user.isVerified && !user.isBlocked && (
              <span className="text-xs text-green-600 flex items-center gap-0.5"><Shield className="w-3 h-3" /> موثق</span>
            )}
            {user.isBlocked && (
              <span className="text-xs text-destructive flex items-center gap-0.5"><ShieldOff className="w-3 h-3" /> محظور</span>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="bg-white rounded-2xl border border-border shadow-xs divide-y divide-border">
          {[
            { icon: Phone, label: "رقم الهاتف", value: user.phone },
            { icon: MapPin, label: "المنطقة", value: user.area ?? "—" },
            { icon: Calendar, label: "تاريخ التسجيل", value: formatDate(user.createdAt) },
            { icon: Clock, label: "آخر تسجيل دخول", value: formatDateTime(user.lastLogin) },
            { icon: Star, label: "التقييم", value: user.rating != null ? `${user.rating.toFixed(1)} / 5.0` : "—" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3.5">
              <row.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="font-medium text-sm">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* OTP section (admin-visible) */}
        {user.otpCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4" data-testid="otp-section">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-amber-800 text-sm">رمز التحقق (لإعادة تعيين كلمة المرور)</p>
            </div>
            <p className="text-2xl font-bold text-amber-700 tracking-widest" data-testid="otp-code">{user.otpCode}</p>
            <p className="text-xs text-amber-600 mt-1">صدر في: {formatDateTime(user.otpCreatedAt)}</p>
          </div>
        )}

        {/* Request counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl border border-border p-3 text-center shadow-xs">
            <p className="text-2xl font-bold text-primary">{allRequests?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">إجمالي الطلبات</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-3 text-center shadow-xs">
            <p className="text-2xl font-bold text-orange-500">{currentRequests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">الطلبات الحالية</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-3 text-center shadow-xs">
            <p className="text-2xl font-bold text-green-600">{pastRequests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">السابقة</p>
          </div>
        </div>

        {/* Current requests */}
        {currentRequests.length > 0 && (
          <div>
            <p className="text-sm font-bold mb-2">الطلبات الحالية</p>
            <div className="space-y-2">
              {currentRequests.map((req) => {
                const cat = CATEGORY_MAP[req.category] ?? { label: req.category };
                const status = STATUS_MAP[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <div key={req.id} className="bg-white rounded-xl border border-border p-3 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-primary">{cat.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{req.details}</p>
                    <p className="text-xs text-green-600 font-bold mt-1">{req.offeredAmount} ر.ع. · {req.area}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past requests */}
        {pastRequests.length > 0 && (
          <div>
            <p className="text-sm font-bold mb-2">الطلبات السابقة</p>
            <div className="space-y-2">
              {pastRequests.map((req) => {
                const cat = CATEGORY_MAP[req.category] ?? { label: req.category };
                const status = STATUS_MAP[req.status] ?? { label: req.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <div key={req.id} className="bg-white rounded-xl border border-border p-3 shadow-xs opacity-75">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">{cat.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{req.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">{req.offeredAmount} ر.ع. · {req.area}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          {user.userType === "helper" && !user.isVerified && !user.isBlocked && (
            <Button className="w-full h-11 rounded-xl" onClick={() => handleAction("verify")} disabled={verifyMutation.isPending} data-testid="btn-verify">
              <Shield className="w-4 h-4 ml-2" /> توثيق الحساب
            </Button>
          )}
          {!user.isBlocked && (
            <Button variant="outline" className="w-full h-11 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handleAction("block")} disabled={verifyMutation.isPending} data-testid="btn-block">
              <ShieldOff className="w-4 h-4 ml-2" /> حظر الحساب
            </Button>
          )}
          {user.isBlocked && (
            <Button className="w-full h-11 rounded-xl" onClick={() => handleAction("verify")} disabled={verifyMutation.isPending} data-testid="btn-unblock">
              <Shield className="w-4 h-4 ml-2" /> رفع الحظر
            </Button>
          )}
          <Button variant="outline" className="w-full h-11 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleDelete} disabled={deleteMutation.isPending} data-testid="btn-delete-user">
            <Trash2 className="w-4 h-4 ml-2" /> حذف المستخدم نهائياً
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Users List ────────────────────────────────────────────────────────────────
export default function UsersManagement() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users, isLoading } = useListUsers(undefined, {
    query: { queryKey: getListUsersQueryKey() },
  });

  if (selectedUserId) {
    return <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">المستخدمون</h1>
        <p className="text-muted-foreground text-sm">اضغط على مستخدم لعرض التفاصيل</p>
      </div>

      <div className="px-4 py-5 pb-nav space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}

        {users?.filter((u) => u.userType !== "admin").map((u) => (
          <button
            key={u.id}
            className="w-full bg-white rounded-2xl border border-border p-4 shadow-xs flex items-center gap-3 text-right hover:border-primary/40 hover:shadow-sm transition-all"
            onClick={() => setSelectedUserId(u.id)}
            data-testid={`user-row-${u.id}`}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.phone} · {USER_TYPE_LABELS[u.userType]}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {u.isVerified && !u.isBlocked && <Shield className="w-4 h-4 text-green-500" />}
              {u.isBlocked && <ShieldOff className="w-4 h-4 text-destructive" />}
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
