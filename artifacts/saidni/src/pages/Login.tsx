import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { HandHeart } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  phone: z.string().min(8, "أدخل رقم هاتف صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          setUser(response.user);
          const userType = response.user.userType;
          if (userType === "admin") setLocation("/admin");
          else if (userType === "helper") setLocation("/helper-requests");
          else setLocation("/customer");
        },
        onError: () => {
          toast({ title: "خطأ في تسجيل الدخول", description: "رقم الهاتف أو كلمة المرور غير صحيحة", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="app-container min-h-screen flex flex-col justify-center px-6 py-12 bg-background" dir="rtl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-3">
          <HandHeart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary">ساعدني</h1>
        <p className="text-muted-foreground mt-1">أهلاً بعودتك</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border p-6">
        <h2 className="text-lg font-bold mb-6">تسجيل الدخول</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input placeholder="968XXXXXXXX" type="tel" className="rounded-xl h-12 text-right" data-testid="input-phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" className="rounded-xl h-12" data-testid="input-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl mt-2" disabled={loginMutation.isPending} data-testid="btn-submit-login">
              {loginMutation.isPending ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </Form>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <a href="/register" className="text-primary font-semibold" data-testid="link-register">
            إنشاء حساب
          </a>
        </p>
      </div>

      {/* Demo credentials hint */}
      <div className="mt-6 bg-primary/5 rounded-2xl p-4 text-xs text-muted-foreground text-center space-y-1">
        <p className="font-medium text-foreground">حسابات تجريبية:</p>
        <p>طالب مساعدة: 96891000001</p>
        <p>مساعد: 96891000003</p>
        <p>مدير: 96891000000</p>
        <p className="text-primary">كلمة المرور: 123456</p>
      </div>
    </div>
  );
}
