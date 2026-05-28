import { Link, useLocation } from "wouter";
import { PlusCircle, List, User, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isActive = (path: string) =>
    location === path || location.startsWith(path + "/")
      ? "text-primary font-semibold"
      : "text-muted-foreground";

  if (user.userType === "admin") {
    return (
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border flex justify-around items-center py-2 z-50">
        <Link href="/admin">
          <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/admin")}`} data-testid="nav-admin">
            <LayoutDashboard className="w-5 h-5" />
            <span>لوحة التحكم</span>
          </button>
        </Link>
        <Link href="/users-management">
          <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/users-management")}`} data-testid="nav-users">
            <Users className="w-5 h-5" />
            <span>المستخدمون</span>
          </button>
        </Link>
        <Link href="/profile">
          <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/profile")}`} data-testid="nav-profile">
            <User className="w-5 h-5" />
            <span>حسابي</span>
          </button>
        </Link>
      </nav>
    );
  }

  if (user.userType === "helper") {
    return (
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border flex justify-around items-center py-2 z-50">
        <Link href="/helper-requests">
          <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/helper-requests")}`} data-testid="nav-helper-requests">
            <ClipboardList className="w-5 h-5" />
            <span>الطلبات الحالية</span>
          </button>
        </Link>
        <Link href="/profile">
          <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/profile")}`} data-testid="nav-profile">
            <User className="w-5 h-5" />
            <span>حسابي</span>
          </button>
        </Link>
      </nav>
    );
  }

  // customer
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border flex justify-around items-center py-2 z-50">
      <Link href="/customer">
        <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/customer")}`} data-testid="nav-create-request">
          <PlusCircle className="w-5 h-5" />
          <span>إنشاء طلب</span>
        </button>
      </Link>
      <Link href="/my-requests">
        <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/my-requests")}`} data-testid="nav-my-requests">
          <List className="w-5 h-5" />
          <span>طلباتي</span>
        </button>
      </Link>
      <Link href="/profile">
        <button className={`flex flex-col items-center gap-0.5 text-xs px-4 py-1 ${isActive("/profile")}`} data-testid="nav-profile">
          <User className="w-5 h-5" />
          <span>حسابي</span>
        </button>
      </Link>
    </nav>
  );
}
