import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { HandHeart } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(2, "أدخل اسمك الكامل"),
  phone: z.string().min(8, "أدخل رقم هاتف صحيح"),
  userType: z.enum(["customer", "helper"]),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", userType: "customer" },
  });

  const onSubmit = (data: FormData) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          setUser(response.user);
          setLocation(response.user.userType === "helper" ? "/helper-requests" : "/customer");
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "حدث خطأ أثناء إنشاء الحساب";
          toast({ title: "خطأ", description: msg, variant: "destructive" });
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
        <p className="text-muted-foreground mt-1">إنشاء حساب جديد</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <Input placeholder="أحمد محمد" className="rounded-xl h-12 text-right" data-testid="input-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="userType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الحساب</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-12" data-testid="select-user-type">
                        <SelectValue placeholder="اختر نوع الحساب" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">طالب مساعدة</SelectItem>
                      <SelectItem value="helper">مساعد</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl mt-2"
              disabled={registerMutation.isPending}
              data-testid="btn-submit-register"
            >
              {registerMutation.isPending ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
            </Button>
          </form>
        </Form>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <a href="/login" className="text-primary font-semibold" data-testid="link-login">
          تسجيل الدخول
        </a>
      </p>
    </div>
  );
}
