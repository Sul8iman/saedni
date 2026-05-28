import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "إلغاء",
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-8 sm:pb-0"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-100" : "bg-orange-100"}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-600" : "text-orange-600"}`} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 h-11 rounded-xl text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "جارٍ الحذف..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
