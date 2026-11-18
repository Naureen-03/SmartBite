import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Ban, CheckCircle2, HandHeart, Percent, ShieldAlert } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "@/lib/recharts";
import { ResponsiveContainer } from "recharts-upstream";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AdminOverview, Complaint, Donation, FraudFlag, Order, Restaurant } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDateTime, inr2, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string; name: string; email: string; role: string; is_active: boolean; created_at: string | null;
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState("");

  const { data: overview } = useQuery({ queryKey: ["admin-overview"], queryFn: () => apiGet<AdminOverview>("/admin/overview"), refetchInterval: 10000 });
  const { data: orders } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: () => apiGet<Order[]>(`/admin/orders?status=${statusFilter}`),
    refetchInterval: 8000,
  });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => apiGet<AdminUser[]>("/admin/users") });
  const { data: restaurants } = useQuery({ queryKey: ["admin-restaurants"], queryFn: () => apiGet<Restaurant[]>("/admin/restaurants") });
  const { data: complaints } = useQuery({ queryKey: ["admin-complaints"], queryFn: () => apiGet<Complaint[]>("/admin/complaints") });
  const { data: fraud } = useQuery({ queryKey: ["admin-fraud"], queryFn: () => apiGet<FraudFlag[]>("/admin/fraud"), refetchInterval: 15000 });
  const { data: donations } = useQuery({ queryKey: ["admin-donations"], queryFn: () => apiGet<Donation[]>("/admin/donations") });

  const setCommission = useMutation({
    mutationFn: ({ rid, pct }: { rid: string; pct: number }) =>
      apiPatch(`/admin/restaurants/${rid}/commission`, { commission_pct: pct }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Commission updated");
    },
  });

  const setActive = useMutation({
    mutationFn: ({ uid, active }: { uid: string; active: boolean }) =>
      apiPatch(`/admin/users/${uid}/active`, { is_active: active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User access updated");
    },
  });

  const resolve = useMutation({
    mutationFn: (c: Complaint) => apiPost(`/admin/complaints/${c.id}/resolve`, { resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setResolveTarget(null);
      setResolution("");
      toast.success("Complaint resolved");
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight" data-testid="admin-dash-title">Platform console</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ecosystem health, fees, disputes and fraud — one view.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-6" data-testid="admin-kpis">
        {[
          { label: "Customers", value: overview?.customers ?? 0 },
          { label: "Kitchens", value: overview?.restaurants ?? 0 },
          { label: "Couriers", value: overview?.delivery_partners ?? 0 },
          { label: "GMV (7d)", value: inr2(overview?.gmv_this_week ?? 0) },
          { label: "Commissions (7d)", value: inr2(overview?.commissions_this_week ?? 0) },
          { label: "Meals saved", value: overview?.meals_saved ?? 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="admin-kpi-card">
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-heading text-lg font-extrabold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList data-testid="admin-tabs">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="fees">Commissions</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({complaints?.filter((c) => c.status === "open").length ?? 0})</TabsTrigger>
          <TabsTrigger value="fraud">Fraud radar</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" data-testid="admin-orders-tab">
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
                <SelectTrigger className="w-44" data-testid="admin-status-filter"><SelectValue>{statusFilter === "all" ? "All statuses" : statusFilter}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.keys(STATUS_META).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800" data-testid="admin-orders-table">
                <table className="w-full text-sm">
                  <thead className="bg-accent text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="p-3">Order</th><th className="p-3">Kitchen</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Total</th><th className="p-3">Placed</th></tr>
                  </thead>
                  <tbody>
                    {(orders ?? []).slice(0, 40).map((o) => (
                      <tr key={o.id} className="border-t border-stone-100 dark:border-stone-800">
                        <td className="max-w-40 truncate p-3 font-medium">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                        <td className="p-3 text-muted-foreground">{o.restaurant_name}</td>
                        <td className="p-3 text-muted-foreground">{o.customer_name}</td>
                        <td className="p-3"><Badge className={cn("border-0", (STATUS_META[o.status] ?? STATUS_META.placed).className)}>{(STATUS_META[o.status] ?? STATUS_META.placed).label}</Badge></td>
                        <td className="p-3 font-bold tabular-nums">{inr2(o.total)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{fmtDateTime(o.placed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
              <h3 className="font-heading font-bold">GMV (last 7 days)</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview?.daily_gmv ?? []}>
                    <defs>
                      <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                    <XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "GMV"]} />
                    <Area type="monotone" dataKey="gmv" stroke="#15803d" strokeWidth={2.5} fill="url(#gmvGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" data-testid="admin-users-tab">
          <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800" data-testid="admin-users-table">
            <table className="w-full text-sm">
              <thead className="bg-accent text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Joined</th><th className="p-3">Access</th></tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="p-3 font-semibold">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><Badge variant="outline">{u.role}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{fmtDateTime(u.created_at)}</td>
                    <td className="p-3">
                      {u.role !== "admin" && (
                        u.is_active ? (
                          <Button size="sm" variant="outline" onClick={() => setActive.mutate({ uid: u.id, active: false })} data-testid="admin-block-user-btn">
                            <Ban className="mr-1 h-3.5 w-3.5" /> Block
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setActive.mutate({ uid: u.id, active: true })} data-testid="admin-unblock-user-btn">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Unblock
                          </Button>
                        )
                      )}
                      {!u.is_active && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="fees" data-testid="admin-fees-tab">
          <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800" data-testid="admin-commissions-table">
            <table className="w-full text-sm">
              <thead className="bg-accent text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Kitchen</th><th className="p-3">Area</th><th className="p-3">Rating</th><th className="p-3">Commission %</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {(restaurants ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="p-3 font-semibold">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.area}</td>
                    <td className="p-3">★ {r.rating.toFixed(1)}</td>
                    <td className="p-3">
                      <Input
                        type="number" className="w-20" defaultValue={r.commission_pct} min={0} max={40}
                        onBlur={(e) => setCommission.mutate({ rid: r.id, pct: Number(e.target.value) })}
                        data-testid="admin-commission-input"
                      />
                    </td>
                    <td className="p-3"><Percent className="h-3.5 w-3.5 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Commission applies on item subtotal of delivered orders — saves on blur.</p>
        </TabsContent>

        <TabsContent value="disputes" data-testid="admin-disputes-tab">
          <div className="mt-4 space-y-3" data-testid="admin-disputes-list">
            {(complaints ?? []).map((c) => (
              <div key={c.id} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="admin-dispute-card">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading font-bold">{c.subject}</p>
                  <Badge className={cn("border-0", c.status === "open" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800")}>{c.status}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(c.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">By {c.customer_name} · order {c.order_id.slice(0, 8)}…</p>
                {c.status === "open" && (
                  <Button size="sm" variant="outline" className="mt-3 font-bold" onClick={() => setResolveTarget(c)} data-testid="admin-resolve-dispute-btn">
                    Resolve
                  </Button>
                )}
                {c.resolution && <p className="mt-2 rounded-xl bg-green-50 p-2 text-xs text-green-800 dark:bg-green-950/30 dark:text-green-300">{c.resolution}</p>}
              </div>
            ))}
            {complaints && complaints.length === 0 && <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">No complaints — happy eaters everywhere.</p>}
          </div>
        </TabsContent>

        <TabsContent value="fraud" data-testid="admin-fraud-tab">
          <div className="mt-4 space-y-3" data-testid="admin-fraud-list">
            {(fraud ?? []).map((f, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200/70 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-950/20" data-testid="fraud-flag-card">
                <AlertTriangle className={cn("h-5 w-5 shrink-0", f.severity === "high" ? "text-red-600" : f.severity === "medium" ? "text-amber-600" : "text-stone-500")} />
                <div className="min-w-0">
                  <p className="text-sm font-bold capitalize">{f.kind.replace("-", " ")} · {f.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{f.detail}</p>
                </div>
                <Badge variant="outline" className="ml-auto uppercase">{f.severity}</Badge>
              </div>
            ))}
            {fraud && fraud.length === 0 && (
              <div className="flex items-center gap-3 rounded-3xl border border-green-200/70 bg-green-50 p-8 dark:border-green-900/40 dark:bg-green-950/20">
                <ShieldAlert className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-300">No anomalies detected — velocity, COD and cancellation patterns all nominal.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="impact" data-testid="admin-impact-tab">
          <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800" data-testid="admin-ngo-audit-table">
            <table className="w-full text-sm">
              <thead className="bg-accent text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Kitchen</th><th className="p-3">NGO partner</th><th className="p-3">Meals</th><th className="p-3">Status</th><th className="p-3">When</th></tr>
              </thead>
              <tbody>
                {(donations ?? []).map((d) => (
                  <tr key={d.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="p-3 font-semibold">{d.restaurant_name}</td>
                    <td className="p-3 text-muted-foreground"><HandHeart className="mr-1 inline h-3.5 w-3.5 text-green-600" />{d.ngo_name}</td>
                    <td className="p-3 font-bold tabular-nums">{d.meals}</td>
                    <td className="p-3"><Badge variant={d.status === "collected" ? "default" : "secondary"}>{d.status}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{fmtDateTime(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resolve dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent data-testid="resolve-dispute-dialog">
          <DialogHeader><DialogTitle>Resolve · {resolveTarget?.subject}</DialogTitle></DialogHeader>
          <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolution, e.g. full refund issued" data-testid="resolve-dispute-input" />
          <DialogFooter>
            <Button className="font-bold" onClick={() => resolveTarget && resolve.mutate(resolveTarget)} disabled={resolve.isPending} data-testid="resolve-dispute-confirm-btn">
              Mark resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
