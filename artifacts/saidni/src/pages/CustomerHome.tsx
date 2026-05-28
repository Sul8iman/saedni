import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ShieldOff } from "lucide-react";
import { useCreateRequest } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, AREAS } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  category: z.string().min(1, "اختر التصنيف"),
  details: z.string().min(10, "اكتب تفاصيل الطلب (10 أحرف على الأقل)"),
  timeType: z.enum(["now", "scheduled"]),
  scheduledDateTime: z.string().optional(),
  area: z.string().min(1, "اختر المنطقة"),
  offeredAmount: z.coerce.number().min(0.5, "أدخل المبلغ"),
});

type FormData = z.infer<typeof schema>;

export default function CustomerHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const createRequest = useCreateRequest();
  const [submitted, setSubmitted] = useState(false);

  const isBlocked = user?.isActive === false;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", details: "", timeType: "now", area: "", offeredAmount: 0 },
  });

  const timeType = form.watch("timeType");

  const onSubmit = (data: FormData) => {
    if (!user) return;
    if (isBlocked) {
      toast({ title: "تم تعطيل حسابك", description: "يرجى التواصل مع الإدارة", variant: "destructive" });
      return;
    }
    createRequest.mutate(
      {
        data: {
          customerId: user.id,
          category: data.category as "transport" | "delivery" | "government" | "shopping" | "home_services" | "labor",
          details: data.details,
          timeType: data.timeType,
          scheduledDateTime: data.timeType === "scheduled" ? data.scheduledDateTime : undefined,
          area: data.area,
          offeredAmount: data.offeredAmount,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          form.reset();
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "فشل في نشر الطلب، حاول مرة أخرى";
          toast({ title: "خطأ", description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="app-container bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-border px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-primary">ساعدني</h1>
        <p className="text-muted-foreground text-sm mt-0.5">ماذا تحتاج اليوم؟</p>
      </div>

      <div className="px-4 py-5 pb-nav">

        {/* ── Blocked banner ── */}
        {isBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5 flex items-start gap-3" data-testid="blocked-banner">
            <ShieldOff className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">تم تعطيل حسابك</p>
              <p className="text-sm text-red-700 mt-0.5">
                تم تعطيل حسابك، يرجى التواصل مع الإدارة
              </p>
            </div>
          </div>
        )}

        {/* Success confirmation */}
        {submitted && !isBlocked && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5 flex items-start gap-3" data-testid="success-confirmation">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">تم نشر طلبك</p>
              <p className="text-sm text-green-700 mt-0.5">سيظهر للمساعدين القريبين وسيتواصلون معك قريباً</p>
            </div>
            <button className="mr-auto text-green-500 text-xs" onClick={() => setSubmitted(false)}>طلب جديد</button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Category picker */}
            <div>
              <p className="text-sm font-semibold mb-3">ساعدني في:</p>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            disabled={isBlocked}
                            onClick={() => field.onChange(cat.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center ${
                              isBlocked
                                ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                : field.value === cat.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-white text-muted-foreground hover:border-primary/40"
                            }`}
                            data-testid={`category-${cat.value}`}
                          >
                            <CategoryIcon iconName={cat.icon} className="w-6 h-6" />
                            <span className="text-xs font-medium leading-tight">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Details */}
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تفاصيل الطلب:</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="مثال: أحتاج شخص ينقل أغراض من بوشر إلى الخوير"
                      className="rounded-xl min-h-[90px] text-right resize-none"
                      disabled={isBlocked}
                      data-testid="input-details"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time */}
            <div>
              <p className="text-sm font-semibold mb-2">متى؟</p>
              <FormField
                control={form.control}
                name="timeType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isBlocked}
                          onClick={() => field.onChange("now")}
                          className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${
                            isBlocked
                              ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                              : field.value === "now"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-white text-muted-foreground"
                          }`}
                          data-testid="time-now"
                        >
                          الآن
                        </button>
                        <button
                          type="button"
                          disabled={isBlocked}
                          onClick={() => field.onChange("scheduled")}
                          className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${
                            isBlocked
                              ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                              : field.value === "scheduled"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-white text-muted-foreground"
                          }`}
                          data-testid="time-scheduled"
                        >
                          اختر اليوم والوقت
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {timeType === "scheduled" && (
                <FormField
                  control={form.control}
                  name="scheduledDateTime"
                  render={({ field }) => (
                    <FormItem className="mt-2">
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="rounded-xl h-11"
                          disabled={isBlocked}
                          data-testid="input-scheduled-time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Area */}
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المنطقة:</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isBlocked}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-12" data-testid="select-area">
                        <SelectValue placeholder="اختر المنطقة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AREAS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="offeredAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ المدفوع:</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="كم ريال عماني؟"
                        className="rounded-xl h-12 pl-16 text-right"
                        disabled={isBlocked}
                        data-testid="input-amount"
                        {...field}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">ر.ع.</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-2xl"
              disabled={createRequest.isPending || isBlocked}
              data-testid="btn-publish-request"
            >
              {isBlocked
                ? "تم تعطيل الحساب"
                : createRequest.isPending
                  ? "جارٍ النشر..."
                  : "انشر الطلب"
              }
            </Button>
          </form>
        </Form>
      </div>

      <BottomNav />
    </div>
  );
}
