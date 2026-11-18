import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, Bike, Flame, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Order, TrackInfo } from "@/lib/types";
import FreshnessTracker from "@/components/FreshnessTracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inr2 } from "@/lib/format";

const W = 360, H = 220, PAD = 34;

function CourierMap({ track }: { track: TrackInfo }) {
  const pts = track.route_points;
  if (!pts.length) return null;
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const spanLng = Math.max(maxLng - minLng, 1e-6);
  const xy = (p: number[]): [number, number] => [
    PAD + ((p[1] - minLng) / spanLng) * (W - 2 * PAD),
    H - PAD - ((p[0] - minLat) / spanLat) * (H - 2 * PAD),
  ];
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${xy(p).map((n) => n.toFixed(1)).join(",")}`).join(" ");
  const bike = xy(track.bike_at);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-[#efe9dc] dark:bg-stone-900" data-testid="courier-map">
      <path d={path} fill="none" stroke="#e65100" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
      <circle cx={xy(pts[0])[0]} cy={xy(pts[0])[1]} r="7" fill="#15803d" />
      <text x={xy(pts[0])[0] + 10} y={xy(pts[0])[1] + 4} fontSize="11" fontWeight="700" fill="#1c1917">Pickup</text>
      <circle cx={xy(pts[3])[0]} cy={xy(pts[3])[1]} r="7" fill="#1c1917" />
      <text x={xy(pts[3])[0] - 42} y={xy(pts[3])[1] - 10} fontSize="11" fontWeight="700" fill="#1c1917">You</text>
      {/* pulsing courier */}
      <motion.circle
        cx={bike[0]} cy={bike[1]} r="10"
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        fill="#e65100"
        style={{ transformOrigin: `${bike[0]}px ${bike[1]}px` }}
      />
      <circle cx={bike[0]} cy={bike[1]} r="7" fill="#e65100" stroke="#fff" strokeWidth="2.5" data-testid="bike-marker" />
      <text x={bike[0] - 6} y={bike[1] + 24} fontSize="14">🛵</text>
    </svg>
  );
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiGet<Order>(`/orders/${id}`),
    refetchInterval: 5000,
  });
  const { data: track } = useQuery({
    queryKey: ["track", id],
    queryFn: () => apiGet<TrackInfo>(`/orders/${id}/track`),
    refetchInterval: 5000,
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Button variant="ghost" size="sm" render={<Link to="/orders" />} data-testid="tracking-back-button">
        <ArrowLeft className="mr-1 h-4 w-4" /> All orders
      </Button>

      <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight" data-testid="tracking-title">
        {track?.stage === 5 ? "Enjoy your meal!" : "Your food is on its journey"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {order?.restaurant_name} · {order?.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} · {inr2(order?.total ?? 0)}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-stone-200/80 bg-card p-6 dark:border-stone-800" data-testid="tracking-stages-card">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-400">
            Freshness & preparation tracker
          </h2>
          {order && track ? (
            <div className="mt-4">
              <FreshnessTracker order={order} track={track} />
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Loading live status…</p>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border border-stone-200/80 bg-card p-6 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-400">
                Live courier route
              </h2>
              {track && (
                <Badge className="border-0 bg-orange-100 text-orange-800" data-testid="tracking-eta-badge">
                  <Bike className="mr-1 h-3 w-3" /> {Math.max(1, Math.round(track.minutes_left))} min away
                </Badge>
              )}
            </div>
            {track && track.route_points.length > 0 ? (
              <div className="mt-4">
                <CourierMap track={track} />
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" data-testid="tracking-progress-bar">
                  <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${track.progress_pct}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-accent p-2.5" data-testid="tracking-temp">
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Flame className="h-3 w-3" /> Food temp</p>
                    <p className="font-heading text-sm font-extrabold">{track.temperature_c}°C</p>
                  </div>
                  <div className="rounded-2xl bg-accent p-2.5" data-testid="tracking-distance">
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Navigation className="h-3 w-3" /> Distance</p>
                    <p className="font-heading text-sm font-extrabold">{track.distance_km} km</p>
                  </div>
                  <div className="rounded-2xl bg-accent p-2.5" data-testid="tracking-pin">
                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Pickup PIN</p>
                    <p className="font-heading text-sm font-extrabold tabular-nums">{track.pickup_pin}</p>
                  </div>
                </div>
                {track.partner_name && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="tracking-partner">
                    <MapPin className="h-3 w-3" /> Courier: <span className="font-semibold text-foreground">{track.partner_name}</span> — packed at {track.temperature_c}°C, sealed & tracked
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">The route appears once the kitchen confirms your order.</p>
            )}
          </section>

          {order && (
            <section className="rounded-3xl border border-stone-200/80 bg-card p-6 text-sm dark:border-stone-800" data-testid="tracking-order-summary">
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-400">Order summary</h2>
              <dl className="mt-3 space-y-1.5 text-muted-foreground">
                <div className="flex justify-between"><dt>Item subtotal</dt><dd className="tabular-nums">{inr2(order.subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Packaging</dt><dd className="tabular-nums">{inr2(order.packaging_fee)}</dd></div>
                <div className="flex justify-between"><dt>Delivery {order.batching ? "(eco-batched)" : ""}</dt><dd className="tabular-nums">{inr2(order.delivery_fee)}</dd></div>
                <div className="flex justify-between"><dt>Platform fee</dt><dd className="tabular-nums">{inr2(order.platform_fee)}</dd></div>
                <div className="flex justify-between"><dt>GST</dt><dd className="tabular-nums">{inr2(order.gst)}</dd></div>
                <div className="flex justify-between border-t pt-2 font-heading font-extrabold text-foreground"><dt>Total</dt><dd className="tabular-nums">{inr2(order.total)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">Delivering to: {order.address || "—"}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
