export function money(n: number): string {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ar-SA").format(n);
}

export function formatDate(d: string): string {
  if (!d) return "";
  return d;
}
