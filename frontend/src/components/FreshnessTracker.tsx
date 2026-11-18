// 5-stage Food Freshness & Preparation tracker with a pulsing live stage.
import { Check, ChefHat, PackageCheck, Bike, Home, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";
import type { Order, TrackInfo } from "@/lib/types";

const STAGES = [
  { icon: ReceiptText, label: "Order confirmed & payment verified", atKey: "placed_at" as const },
  { icon: ChefHat, label: "Kitchen accepted — chef preparing", atKey: "accepted_at" as const },
  { icon: PackageCheck, label: "Quality packed, tamper-proof seal", atKey: "ready_at" as const },
  { icon: Bike, label: "Handed to delivery partner", atKey: "picked_at" as const },
  { icon: Home, label: "Delivered at doorstep", atKey: "delivered_at" as const },
];

export default function FreshnessTracker({ order, track }: { order: Order; track: TrackInfo }) {
  const currentStage = track.stage;
  const dead = order.status === "cancelled" || order.status === "rejected";

  return (
    <div className="space-y-0" data-testid="freshness-tracker">
      {STAGES.map((stage, i) => {
        const n = i + 1;
        const done = !dead && n < currentStage;
        const active = !dead && n === currentStage;
        const Icon = stage.icon;
        const ts = order[stage.atKey];
        return (
          <div key={n} className="relative flex gap-4 pb-8 last:pb-0">
            {n < STAGES.length && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5",
                  done ? "bg-green-600" : "bg-stone-200 dark:bg-stone-700",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                done && "border-green-600 bg-green-600 text-white",
                active && "border-primary bg-primary text-white animate-freshness-pulse",
                !done && !active && "border-stone-300 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900",
              )}
              data-testid={active ? "order-track-stage-indicator" : undefined}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <div className="pt-1">
              <p className={cn("text-sm font-semibold", !done && !active && "text-muted-foreground")}>{stage.label}</p>
              {ts && <p className="mt-0.5 text-xs text-muted-foreground">{fmtDateTime(ts)}</p>}
              {active && n === 1 && (
                <p className="mt-1 text-xs font-medium text-primary">Payment verified · {order.payment_method.toUpperCase()}</p>
              )}
              {active && n === 2 && (
                <p className="mt-1 text-xs font-medium text-primary">Prep timer: ~{track.prep_mins} mins · freshness meter on</p>
              )}
              {active && n === 3 && (
                <p className="mt-1 text-xs font-medium text-primary">Packed hot at {track.temperature_c}°C</p>
              )}
              {active && n === 4 && (
                <p className="mt-1 text-xs font-medium text-primary">
                  {track.partner_name ?? "Courier"} is ~{track.distance_km} km away · ETA {Math.max(1, Math.round(track.minutes_left))} min
                </p>
              )}
            </div>
          </div>
        );
      })}
      {dead && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          This order was {order.status}. Any prepaid amount is auto-refunded to your source wallet in 3–5 days.
        </p>
      )}
    </div>
  );
}
