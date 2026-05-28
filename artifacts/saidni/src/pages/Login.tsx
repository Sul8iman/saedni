import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { HandHeart, ArrowRight, KeyRound } from "lucide-react";
import { useLogin, useForgotPassword } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  phone: z.string().min(8, "أدخل رقم هاتف صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const forgotSchema = z.object({
  phone: z.string().min(8, "أدخل رقم هاتف صحيح"),
});

type LoginData = z.infer<typeof loginSchema>;
type ForgotData = z.infer<typeof forgotSchema>;

export default function Login() {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const forgotMutation = useForgotPassword();
  const [showForgot, setShowForgot] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const forgotForm = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { phone: "" },
  });

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          setUser(response.user);
          const t = response.user.userType;
          setLocation(t === "admin" ? "/admin" : t === "helper" ? "/helper-requests" : "/customer");
        },
        onError: () => {
          toast({ title: "خطأ في تسجيل الدخول", description: "رقم الهاتف أو كلمة المرور غير صحيحة", variant: "destructive" });
        },
      }
    );
  };

  const onForgot = (data: ForgotData) => {
    forgotMutation.mutate(
      { data },
      {
        onSuccess: () => {
          setOtpSent(true);
        },
        onError: () => {
          toast({ title: "خطأ", description: "رقم الهاتف غير مسجل في النظام", variant: "destructive" });
        },
      }
    );
  };

  // ── Forgot password view ─────────────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="app-container min-h-screen flex flex-col justify-center px-6 py-12 bg-background" dir="rtl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-3">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">استعادة كلمة المرور</h1>
          <p className="text-muted-foreground mt-1 text-sm">سيتم إرسال رمز التحقق للإدارة</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-border p-6">
          {otpSent ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <KeyRound className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-semibold text-green-800">تم إرسال رمز التحقق للإدارة</p>
              <p className="text-sm text-muted-foreground">
                يرجى التواصل مع مدير النظام للحصول على رمز التحقق وإعادة تعيين كلمة المرور
              </p>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
                onClick={() => { setShowForgot(false); setOtpSent(false); }}
              >
                العودة لتسجيل الدخول
              </Button>
            </div>
          ) : (
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف المسجل</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="968XXXXXXXX"
                          type="tel"
                          className="rounded-xl h-12 text-right"
                          data-testid="input-forgot-phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  disabled={forgotMutation.isPending}
                  data-testid="btn-send-otp"
                >
                  {forgotMutation.isPending ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
                </Button>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => setShowForgot(false)}
                >
                  <ArrowRight className="w-4 h-4" />
                  العودة
                </button>
              </form>
            </Form>
          )}
        </div>
      </div>
    );
  }

  // ── Login view ────────────────────────────────────────────────────────────
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
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <FormField
              control={loginForm.control}
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
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-1">
                    <FormLabel>كلمة المرور</FormLabel>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setShowForgot(true)}
                      data-testid="btn-forgot-password"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" className="rounded-xl h-12" data-testid="input-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl mt-2"
              disabled={loginMutation.isPending}
              data-testid="btn-submit-login"
            >
              {loginMutation.isPending ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </Form>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        ليس لديك حساب؟{" "}
        <a href="/register" className="text-primary font-semibold" data-testid="link-register">
          إنشاء حساب
        </a>
      </p>

      <div className="mt-6 bg-primary/5 rounded-2xl p-4 text-xs text-muted-foreground text-center space-y-1">
        <p className="font-medium text-foreground">حسابات تجريبية:</p>
        <p>طالب مساعدة: 96891000001</p>
        <p>مساعد: 96891000003</p>
        <p>مدير: 96891000000</p>
        <p className="text-primary font-medium">كلمة المرور: 123456</p>
      </div>
    </div>
  );
}
