import { useState } from "react";
import { useLocation } from "wouter";
import { HandHeart, Phone, KeyRound, RefreshCw, ShieldAlert } from "lucide-react";
import { useLogin, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "phone" | "otp";

export default function Login() {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation  = useLogin();
  const verifyMutation = useVerifyOtp();

  const [step, setStep]             = useState<Step>("phone");
  const [phone, setPhone]           = useState("");
  const [otp, setOtp]               = useState("");
  const [testOtp, setTestOtp]       = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 8) {
      toast({ title: "خطأ", description: "أدخل رقم هاتف صحيح", variant: "destructive" });
      return;
    }
    loginMutation.mutate(
      { data: { phone: phone.trim() } },
      {
        onSuccess: (res) => {
          console.log("OTP page phoneNumber:", phone.trim());
          setTestOtp(res.otp ?? null);
          setUnverified(res.isVerified === false);
          setStep("otp");
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "رقم الهاتف غير مسجل في النظام";
          toast({ title: "خطأ", description: msg, variant: "destructive" });
        },
      }
    );
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 4) {
      toast({ title: "خطأ", description: "الرمز يتكون من 4 أرقام", variant: "destructive" });
      return;
    }
    console.log("OTP page phoneNumber:", phone.trim());
    verifyMutation.mutate(
      { data: { phone: phone.trim(), otp: otp.trim() } },
      {
        onSuccess: (response) => {
          console.log("OTP valid, logging in user:", response.user.id, response.user.userType);
          setUser(response.user);
          const t = response.user.userType;
          const dest = t === "admin" ? "/admin" : t === "helper" ? "/helper-requests" : "/customer";
          setLocation(dest);
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "رمز التحقق غير صحيح";
          toast({ title: "خطأ", description: msg, variant: "destructive" });
        },
      }
    );
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = () => {
    setOtp("");
    setTestOtp(null);
    loginMutation.mutate(
      { data: { phone: phone.trim() } },
      {
        onSuccess: (res) => {
          setTestOtp(res.otp ?? null);
          setUnverified(res.isVerified === false);
          toast({ title: "تم إنشاء رمز جديد" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل إنشاء رمز جديد", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="app-container min-h-screen flex flex-col justify-center px-6 py-12 bg-background" dir="rtl">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-3">
          <HandHeart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary">ساعدني</h1>
        <p className="text-muted-foreground mt-1">أهلاً بعودتك</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border p-6">

        {/* ── Step 1: Phone ── */}
        {step === "phone" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-primary" />
              <p className="font-semibold text-sm">أدخل رقم هاتفك</p>
            </div>
            <Input
              type="tel"
              placeholder="968XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl h-12 font-mono"
              data-testid="input-phone"
              dir="ltr"
            />
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={loginMutation.isPending}
              data-testid="btn-request-otp"
            >
              {loginMutation.isPending ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
            </Button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${unverified ? "bg-orange-100" : "bg-primary/10"}`}>
                {unverified
                  ? <ShieldAlert className="w-6 h-6 text-orange-500" />
                  : <KeyRound className="w-6 h-6 text-primary" />
                }
              </div>
              <p className="font-semibold">
                {unverified ? "حسابك غير مفعّل بعد" : "أدخل رمز التحقق"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {unverified
                  ? "يرجى إدخال رمز التحقق من الإدارة لتفعيل حسابك"
                  : <>أدخل رمز التحقق المرسل من الإدارة للرقم: <span className="font-mono font-bold text-foreground" dir="ltr">{phone}</span></>
                }
              </p>
            </div>

            {unverified && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center" data-testid="unverified-banner">
                <p className="text-xs text-orange-700 font-medium">
                  حسابك غير مفعل. يرجى إدخال رمز التحقق من الإدارة للرقم:{" "}
                  <span className="font-mono font-bold" dir="ltr">{phone}</span>
                </p>
              </div>
            )}

            {testOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center" data-testid="test-otp-box">
                <p className="text-xs text-amber-700 font-medium mb-1">رمز التحقق (للاختبار)</p>
                <p className="text-3xl font-bold tracking-[0.3em] text-amber-800" data-testid="test-otp-value">
                  {testOtp}
                </p>
              </div>
            )}

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="- - - -"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="rounded-xl h-14 text-center text-2xl tracking-[0.4em] font-mono"
              data-testid="input-otp"
              dir="ltr"
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={verifyMutation.isPending || otp.length < 4}
              data-testid="btn-verify-otp"
            >
              {verifyMutation.isPending
                ? "جارٍ التحقق..."
                : unverified ? "تفعيل الحساب والدخول" : "تأكيد الدخول"
              }
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); setTestOtp(null); setUnverified(false); }}
                className="text-muted-foreground hover:text-foreground"
                data-testid="btn-back-phone"
              >
                تغيير الرقم
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={loginMutation.isPending}
                className="text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                data-testid="btn-resend-otp"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                رمز جديد
              </button>
            </div>
          </form>
        )}
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
        <p className="text-primary font-medium">الرمز يظهر تلقائياً عند تسجيل الدخول</p>
      </div>
    </div>
  );
}
