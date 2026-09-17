const FOREIGN_KEY_CONFLICT_MESSAGE = "لا يمكن حذف هذا الحساب لوجود سجلات تواصل أو تقييمات مرتبطة به";

export function accountDeletionErrorMessage(status: number, serverError?: unknown): string {
  if (status === 403) {
    return typeof serverError === "string" && serverError.length > 0
      ? serverError
      : "لا يمكنك حذف هذا الحساب";
  }
  if (status === 404) return "المستخدم غير موجود";
  if (status === 409) return FOREIGN_KEY_CONFLICT_MESSAGE;
  return "تعذر حذف الحساب";
}