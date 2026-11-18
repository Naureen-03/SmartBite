import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Bike, CheckCircle2, MapPin, PackageCheck, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "@/lib/recharts";
import { ResponsiveContainer } from "recharts-upstream";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type { DeliveryBatch, DeliveryMe, Order } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDateTime, inr2, STATUS_META } from "@/lib/format";

export default function DeliveryDashboard() {
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["delivery-me"], queryFn: () => apiGet<DeliveryMe>("/delivery/me") });
  const { data: batches } = useQuery({
    queryKey: ["delivery-available"],
    queryFn: () => apiGet<DeliveryBatch[]>("/delivery/available"),
    refetchInterval: 8000,
  });
  const { data: trip } = useQuery({
    queryKey: ["delivery-trip"],
    queryFn: () => apiGet<Order[]>("/delivery/trip"),
    refetchInterval: 5000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["delivery-available"] });
    queryClient.invalidateQueries({ queryKey: ["delivery-trip"] });
    queryClient.invalidateQueries({ queryKey: ["delivery-me"] });
  };

  const claim = useMutation({
    mutationFn: (orderIds: string[]) => apiPost<{ claimed: number }>("/delivery/claim", { order_ids: orderIds }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.claimed} delivery${res.claimed > 1 ? "ies" : ""} claimed — heading to pickup`);
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Could not claim"),
  });

  const advance = useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: string }) => apiPost(`/orders/${orderId}/${action}`),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.action === "picked" ? "Picked up — route optimized for drops" : "Delivery completed — payout credited");
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Action failed"),
  });

  const weekly = Object.entries(me?.weekly ?? {}).map(([day, amount]) => ({ day, amount }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight" data-testid="delivery-dash-title">Delivery cockpit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {me?.name} · {me?.vehicle} · <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {me?.rating ?? "—"}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="delivery-kpis">
        {[
          { label: "Today's earnings", value: inr2(me?.today_earnings ?? 0), testid: "kpi-today-earnings" },
          { label: "This week", value: inr2(me?.week_earnings ?? 0), testid: "kpi-week-earnings" },
          { label: "Lifetime deliveries", value: me?.total_deliveries ?? 0, testid: "kpi-total-deliveries" },
          { label: "Active drops", value: trip?.length ?? 0, testid: "kpi-active-drops" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid={k.testid}>
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-heading text-xl font-extrabold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Active trip */}
        <section data-testid="active-trip-section">
          <h2 className="font-heading font-bold">Active trip</h2>
          <div className="mt-3 space-y-3">
            {(trip ?? []).map((o, idx) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.ready;
              return (
                <div key={o.id} className="rounded-2xl border border-sky-200/70 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20" data-testid="delivery-trip-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-extrabold text-white">{idx + 1}</span>
                    <p className="font-heading text-sm font-bold">{o.restaurant_name} → drop {idx + 1}</p>
                    <Badge className={cnBadge(meta)}>{meta.label}</Badge>
                    <span className="ml-auto font-heading font-extrabold text-green-700 dark:text-green-400">+{inr2(o.payout)}</span>
                  </div>
                  <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {o.address}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold tabular-nums dark:bg-stone-900" data-testid="pickup-pin-chip">
                      Pickup PIN {o.pickup_pin}
                    </span>
                    {o.status === "ready" && (
                      <Button size="sm" className="font-bold" onClick={() => advance.mutate({ orderId: o.id, action: "picked" })} data-testid="delivery-confirm-pickup-btn">
                        <PackageCheck className="mr-1 h-3.5 w-3.5" /> Confirm pickup
                      </Button>
                    )}
                    {o.status === "picked" && (
                      <Button size="sm" className="font-bold" onClick={() => advance.mutate({ orderId: o.id, action: "delivered" })} data-testid="delivery-mark-delivered-btn">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark delivered
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {trip && trip.length === 0 && (
              <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground" data-testid="no-active-trip">
                No active trip — claim a batch on the right to start earning.
              </p>
            )}
          </div>

          {/* Earnings chart */}
          <div className="mt-6 rounded-2xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
            <h3 className="flex items-center gap-2 font-heading font-bold"><Banknote className="h-4 w-4 text-green-600" /> This week's payouts</h3>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                  <XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Payout"]} />
                  <Bar dataKey="amount" fill="#0284c7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Available batches */}
        <section data-testid="available-batches-section">
          <h2 className="flex items-center gap-2 font-heading font-bold">
            <Bike className="h-4 w-4 text-primary" /> Ready to pick up — eco-batched
          </h2>
          <p className="text-xs text-muted-foreground">Orders grouped by kitchen = one pickup, optimized drops.</p>
          <div className="mt-3 space-y-3">
            {(batches ?? []).map((b) => (
              <div key={b.restaurant_id} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="delivery-batch-card">
                <div className="flex items-center gap-3">
                  <img src={b.image_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{b.restaurant_name}</p>
                    <p className="text-xs text-muted-foreground">{b.area} · {b.orders.length} order{b.orders.length > 1 ? "s" : ""}</p>
                  </div>
                  <p className="font-heading text-sm font-extrabold text-green-700 dark:text-green-400" data-testid="batch-payout">+{inr2(b.total_payout)}</p>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground" data-testid="batch-orders">
                  {b.orders.map((o) => (
                    <li key={o.id} className="flex justify-between rounded-lg bg-accent px-2.5 py-1.5">
                      <span>{o.customer_name} · {o.items.length} item{o.items.length > 1 ? "s" : ""}{o.batching ? " · eco" : ""}</span>
                      <span className="font-semibold text-foreground">→ {o.address.split(",").slice(-2, -1)[0] ?? o.address}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm" className="mt-3 font-bold"
                  onClick={() => claim.mutate(b.orders.map((o) => o.id))}
                  disabled={claim.isPending}
                  data-testid="delivery-accept-batch-btn"
                >
                  Accept batch ({b.orders.length} drop{b.orders.length > 1 ? "s" : ""})
                </Button>
              </div>
            ))}
            {batches && batches.length === 0 && (
              <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground" data-testid="no-batches">
                No ready orders right now — batches appear as kitchens finish packing.
              </p>
            )}
          </div>

          {/* Recent history */}
          <div className="mt-6">
            <h3 className="font-heading font-bold">Recent deliveries</h3>
            <div className="mt-2 space-y-2" data-testid="delivery-history">
              {(me?.history ?? []).slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center gap-2 rounded-xl bg-accent p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <span className="min-w-0 flex-1 truncate">{o.restaurant_name} → {o.customer_name}</span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(o.delivered_at)}</span>
                  <span className="font-bold tabular-nums text-green-700 dark:text-green-400">+{inr2(o.payout)}</span>
                </div>
              ))}
              {me && me.history.length === 0 && <p className="text-sm text-muted-foreground">Completed deliveries land here.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function cnBadge(meta: { className: string }): string {
  return `border-0 ${meta.className}`;
}
