import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="app-container min-h-screen flex flex-col items-center justify-center px-6 text-center" dir="rtl">
      <p className="text-6xl font-bold text-primary/20 mb-4">404</p>
      <h1 className="text-xl font-bold mb-2">الصفحة غير موجودة</h1>
      <p className="text-muted-foreground text-sm mb-6">عذراً، الصفحة التي تبحث عنها غير موجودة</p>
      <Link href="/">
        <Button className="rounded-xl" data-testid="btn-go-home">العودة للرئيسية</Button>
      </Link>
    </div>
  );
}
