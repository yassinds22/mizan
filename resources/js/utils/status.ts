export function getStatusPillClass(status: string): string {
  if (["متوفر", "مكتمل", "مدفوعة", "مرحّل", "مرحل", "نشط", "متوازن", "استلام", "مدفوع"].includes(status)) {
    return "pill-ok";
  }
  if (["منخفض", "جزئي", "آجلة", "قيد الاستلام", "متوسط", "مراقبة", "تسوية"].includes(status)) {
    return "pill-warn";
  }
  if (["حرج", "عالي", "مسودة", "غير متوازن", "تالف", "معلق", "ملغي", "هدر", "إهلاك هدر"].includes(status)) {
    return "pill-danger";
  }
  if (["صرف", "تحويل"].includes(status)) {
    return "pill-info";
  }
  return "pill-neutral";
}
