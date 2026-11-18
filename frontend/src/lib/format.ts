// Locale formatting (en-IN) + order status metadata.

export const inr = (n: number): string =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const inr2 = (n: number): string =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export const STATUS_META: Record<string, { label: string; className: string }> = {
  placed: { label: "Placed", className: "bg-sky-100 text-sky-800" },
  accepted: { label: "Accepted", className: "bg-amber-100 text-amber-800" },
  preparing: { label: "Preparing", className: "bg-orange-100 text-orange-800" },
  ready: { label: "Ready", className: "bg-lime-100 text-lime-800" },
  picked: { label: "On the way", className: "bg-blue-100 text-blue-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-stone-200 text-stone-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export const PAYMENT_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  cod: "Cash on delivery",
  wallet: "SmartBite Wallet",
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Minutes remaining until a HH:MM local close time — powers the surplus countdown (display-only). */
export function minutesUntil(closesAt: string): number {
  const [h, m] = closesAt.split(":").map(Number);
  const now = new Date();
  const close = new Date(now);
  close.setHours(h || 0, m || 0, 0, 0);
  return Math.max(0, Math.round((close.getTime() - now.getTime()) / 60000));
}
