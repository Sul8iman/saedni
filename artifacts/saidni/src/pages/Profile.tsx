import { useLocation } from "wouter";
import { User, Star, MapPin, Phone, Shield, LogOut } from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

const USER_TYPE_LABELS: Record<string, string> = {
  customer: "طالب مساعدة",
  helper: "مساعد",
  admin: "مدير النظام",
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(
      {},
      {
        onSuccess: () => {
          logout();
          setLocation("/");
        },
        onError: () => {
          logout();
          setLocation("/");
        },
      }
    );
  };

  if (!user) return null;

  return (
    <div className="app-container bg-background" dir="rtl">
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">حسابي</h1>
      </div>

      <div className="px-4 py-5 pb-nav space-y-4">
        {/* Avatar & name */}
        <div className="bg-white rounded-3xl border border-border p-6 shadow-xs text-center">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold" data-testid="profile-name">{user.name}</h2>
          <span className="inline-block mt-1.5 text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary" data-testid="profile-user-type">
            {USER_TYPE_LABELS[user.userType] ?? user.userType}
          </span>
          {user.isVerified && (
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <Shield className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">حساب موثق</span>
            </div>
          )}
          {user.isBlocked && (
            <div className="flex items-center justify-center gap-1 mt-2 text-destructive">
              <Shield className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">الحساب محظور</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl border border-border shadow-xs divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">رقم الهاتف</p>
              <p className="font-medium text-sm" data-testid="profile-phone">{user.phone}</p>
            </div>
          </div>
          {user.area && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">المنطقة</p>
                <p className="font-medium text-sm" data-testid="profile-area">{user.area}</p>
              </div>
            </div>
          )}
          {user.userType === "helper" && user.rating != null && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">التقييم</p>
                <p className="font-bold text-sm text-yellow-600" data-testid="profile-rating">
                  {user.rating.toFixed(1)} / 5.0
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="btn-logout"
        >
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
