import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, User, Phone, Calendar, Clock, ClipboardList, CheckCheck, PowerOff, Power, KeyRound,
} from "lucide-react";
import {
  useListUsers,
  getListUsersQueryKey,
  useUpdateUser,
  useGetUser,
  getGetUserQueryKey,
  useListRequests,
  getListRequestsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_MAP } from "@/lib/categories";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const USER_TYPE_LABELS: Record<string, string> = {
  customer: "طالب مساعدة",
  helper:   "مساعد",
  admin:    "مدير",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-OM", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-OM", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── User Detail Panel ─────────────────────────────────────────────────────────
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

  const updateMutation = useUpdateUser();

  const activeRequests = allRequests?.filter((r) => r.status !== "completed" && r.status !== "cancelled") ?? [];
  const pastRequests   = allRequests?.filter((r) => r.status === "completed" || r.status === "cancelled") ?? [];

  const handleToggle = () => {
    if (!user) return;
    const next = !user.isActive;
    updateMutation.mutate(
      { id: user.id, data: { isActive: next } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: next ? "تم تفعيل الحساب" : "تم تعطيل الحساب" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل تحديث الحساب", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 pt-16">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  const isActive = user.isActive ?? true;

  return (
    <div className="app-container bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground" data-testid="btn-back-users">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">تفاصيل المستخدم</h1>
      </div>

      <div className="px-4 py-5 pb-nav space-y-4">
        {/* Avatar & identity */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-xs text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
            <User className={`w-8 h-8 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <h2 className="text-lg font-bold">{user.name}</h2>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {USER_TYPE_LABELS[user.userType] ?? user.userType}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {isActive ? "مفعّل" : "معطّل"}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="bg-white rounded-2xl border border-border shadow-xs divide-y divide-border">
          {[
            { icon: Phone,    label: "رقم الهاتف",        value: user.phone,                    dir: "ltr" as const },
            { icon: User,     label: "نوع الحساب",        value: USER_TYPE_LABELS[user.userType] ?? user.userType },
            { icon: Calendar, label: "تاريخ التسجيل",     value: formatDate(user.createdAt) },
            { icon: Clock,    label: "آخر تسجيل دخول",   value: formatDateTime(user.lastLogin) },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3.5">
              <row.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className={`font-medium text-sm ${row.dir === "ltr" ? "font-mono" : ""}`} dir={row.dir}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* OTP (admin visible) */}
        {user.otpCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4" data-testid="otp-section">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-amber-800 text-sm">رمز التحقق (إعادة كلمة المرور)</p>
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
            <p className="text-2xl font-bold text-orange-500">{activeRequests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">الطلبات الحالية</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-3 text-center shadow-xs">
            <p className="text-2xl font-bold text-gray-500">{pastRequests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">السابقة</p>
          </div>
        </div>

        {/* Current requests */}
        {activeRequests.length > 0 && (
          <div>
            <p className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-orange-500" />
              الطلبات الحالية
            </p>
            <div className="space-y-2">
              {activeRequests.map((req) => {
                const cat = CATEGORY_MAP[req.category] ?? { label: req.category };
                return (
                  <div key={req.id} className="bg-white rounded-xl border border-border p-3 shadow-xs">
                    <p className="text-xs font-semibold text-primary mb-0.5">{cat.label}</p>
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
            <p className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-gray-400" />
              الطلبات السابقة
            </p>
            <div className="space-y-2">
              {pastRequests.map((req) => {
                const cat = CATEGORY_MAP[req.category] ?? { label: req.category };
                return (
                  <div key={req.id} className="bg-white rounded-xl border border-border p-3 shadow-xs opacity-70">
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">{cat.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{req.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">{req.offeredAmount} ر.ع. · {req.area}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Single toggle action */}
        <div className="pt-1">
          {isActive ? (
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleToggle}
              disabled={updateMutation.isPending}
              data-testid="btn-toggle-user"
            >
              <PowerOff className="w-4 h-4 ml-2" />
              تعطيل المستخدم
            </Button>
          ) : (
            <Button
              className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white"
              onClick={handleToggle}
              disabled={updateMutation.isPending}
              data-testid="btn-toggle-user"
            >
              <Power className="w-4 h-4 ml-2" />
              تفعيل المستخدم
            </Button>
          )}
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
        <p className="text-muted-foreground text-sm">اضغط على مستخدم لعرض التفاصيل وإدارة حسابه</p>
      </div>

      <div className="px-4 py-5 pb-nav space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}

        {users?.filter((u) => u.userType !== "admin").map((u) => {
          const active = u.isActive ?? true;
          return (
            <button
              key={u.id}
              className="w-full bg-white rounded-2xl border border-border p-4 shadow-xs flex items-center gap-3 text-right hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => setSelectedUserId(u.id)}
              data-testid={`user-row-${u.id}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-primary/10" : "bg-muted"}`}>
                <User className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${!active ? "text-muted-foreground" : ""}`}>{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.phone} · {USER_TYPE_LABELS[u.userType]}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">معطّل</span>
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
