import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, HandHeart, Pencil, Plus, Power, X } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "@/lib/recharts";
import { ResponsiveContainer } from "recharts-upstream";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AnalyticsResp, DashboardResp, MenuItem, Restaurant } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDateTime, inr2, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";

const NGOS = ["Feeding India", "Robin Hood Army", "Annamrita Foundation", "Food Seva Sangh"];

export default function RestaurantDashboard() {
  const queryClient = useQueryClient();
  const [ridOverride, setRidOverride] = useState<string | null>(null);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateMeals, setDonateMeals] = useState(10);
  const [donateNgo, setDonateNgo] = useState(NGOS[0]);
  const [newForm, setNewForm] = useState({ name: "", price: "", category: "Main Course", description: "" });

  const { data: mine } = useQuery({
    queryKey: ["my-restaurants"],
    queryFn: () => apiGet<Restaurant[]>("/dashboard/restaurant/my-restaurants"),
  });
  const rid = ridOverride ?? mine?.[0]?.id ?? null;

  const { data: dash } = useQuery({
    queryKey: ["restaurant-dash", rid],
    queryFn: () => apiGet<DashboardResp>(`/dashboard/restaurant?restaurant_id=${rid}`),
    enabled: !!rid,
    refetchInterval: 6000,
  });
  const { data: analytics } = useQuery({
    queryKey: ["restaurant-analytics", rid],
    queryFn: () => apiGet<AnalyticsResp>(`/dashboard/restaurant/analytics?restaurant_id=${rid}`),
    enabled: !!rid,
  });
  const { data: donations } = useQuery({
    queryKey: ["restaurant-donations", rid],
    queryFn: () => apiGet<{ id: string; ngo_name: string; meals: number; status: string; created_at: string }[]>(`/dashboard/restaurant/donations?restaurant_id=${rid}`),
    enabled: !!rid,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["restaurant-dash", rid] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-analytics", rid] });
  };

  const transition = useMutation({
    mutationFn: ({ orderId, action }: { orderId: string; action: string }) => apiPost(`/orders/${orderId}/${action}`),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.action === "accepted" ? "Order accepted — kitchen pinged" : v.action === "rejected" ? "Order rejected" : "Status updated");
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Action failed"),
  });

  const patchItem = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiPatch<MenuItem>(`/dashboard/restaurant/menu-items/${id}`, body),
    onSuccess: () => {
      invalidate();
      toast.success("Menu updated");
    },
  });

  const createItem = useMutation({
    mutationFn: () =>
      apiPost("/dashboard/restaurant/menu-items", {
        restaurant_id: rid, name: newForm.name, price: Number(newForm.price),
        category: newForm.category, description: newForm.description,
      }),
    onSuccess: () => {
      invalidate();
      setNewItemOpen(false);
      setNewForm({ name: "", price: "", category: "Main Course", description: "" });
      toast.success("Dish added to the menu");
    },
  });

  const saveSettings = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPatch<Restaurant>(`/dashboard/restaurant/settings?restaurant_id=${rid}`, body),
    onSuccess: () => {
      invalidate();
      toast.success("Kitchen settings saved");
    },
  });

  const donate = useMutation({
    mutationFn: () => apiPost("/dashboard/restaurant/donate", { restaurant_id: rid, meals: donateMeals, ngo_name: donateNgo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-donations", rid] });
      setDonateOpen(false);
      toast.success(`${donateMeals} meals pledged to ${donateNgo} — pickup request sent`);
    },
  });

  const rest = dash?.restaurant;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight" data-testid="restaurant-dash-title">Kitchen console</h1>
        {mine && mine.length > 1 && (
          <Select value={rid ?? ""} onValueChange={(v: string) => setRidOverride(v)}>
            <SelectTrigger className="w-64" data-testid="restaurant-dash-select"><SelectValue>{rest?.name}</SelectValue></SelectTrigger>
            <SelectContent>
              {mine.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Power className={cn("h-4 w-4", rest?.is_open ? "text-green-600" : "text-red-500")} />
            {rest?.is_open ? "Open" : "Closed"}
            <Checkbox
              checked={rest?.is_open ?? false}
              onCheckedChange={(c) => saveSettings.mutate({ is_open: c === true })}
              data-testid="restaurant-open-toggle"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            Prep <Input
              type="number" className="w-16" defaultValue={rest?.prep_time_mins ?? 25}
              onBlur={(e) => saveSettings.mutate({ prep_time_mins: Number(e.target.value) })}
              data-testid="restaurant-prep-time-input"
            /> min
          </label>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="restaurant-kpis">
        {[
          { label: "Pending orders", value: dash?.stats.pending_count ?? 0, testid: "kpi-pending" },
          { label: "Orders today", value: dash?.stats.today_orders ?? 0, testid: "kpi-orders-today" },
          { label: "Revenue today", value: inr2(dash?.stats.today_revenue ?? 0), testid: "kpi-revenue-today" },
          { label: "Commission today", value: inr2(dash?.stats.today_commission ?? 0), testid: "kpi-commission-today" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid={k.testid}>
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-heading text-xl font-extrabold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList data-testid="restaurant-dash-tabs">
          <TabsTrigger value="orders">Live orders</TabsTrigger>
          <TabsTrigger value="menu">Menu & inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="impact">Food rescue</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" data-testid="restaurant-orders-queue">
          <div className="mt-4 space-y-3">
            {(dash?.active_orders ?? []).map((o) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.placed;
              return (
                <div key={o.id} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="restaurant-order-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading font-bold">{o.customer_name}</p>
                    <Badge className={cn("border-0", meta.className)}>{meta.label}</Badge>
                    {o.batching && <Badge variant="outline" className="text-green-700 dark:text-green-400">Eco-batched</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(o.placed_at)}</span>
                    <span className="font-heading font-extrabold">{inr2(o.total)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Deliver to: {o.address}</p>
                  <div className="mt-3 flex gap-2">
                    {o.status === "placed" && (
                      <>
                        <Button size="sm" className="font-bold" onClick={() => transition.mutate({ orderId: o.id, action: "accepted" })} data-testid="restaurant-accept-order-btn">
                          <Check className="mr-1 h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => transition.mutate({ orderId: o.id, action: "rejected" })} data-testid="restaurant-reject-order-btn">
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {o.status === "accepted" && (
                      <Button size="sm" className="font-bold" onClick={() => transition.mutate({ orderId: o.id, action: "preparing" })} data-testid="restaurant-start-prep-btn">
                        Start preparing
                      </Button>
                    )}
                    {o.status === "preparing" && (
                      <Button size="sm" className="font-bold" onClick={() => transition.mutate({ orderId: o.id, action: "ready" })} data-testid="restaurant-mark-ready-btn">
                        Packed & ready
                      </Button>
                    )}
                    {o.status === "ready" && (
                      <Badge variant="secondary" data-testid="restaurant-awaiting-pickup">Awaiting pickup partner · PIN {o.pickup_pin}</Badge>
                    )}
                    {o.status === "picked" && (
                      <Badge variant="secondary">Out with {o.partner_name}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {dash && dash.active_orders.length === 0 && (
              <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">No live orders — the queue is clear.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu" data-testid="restaurant-menu-manager">
          <div className="mt-4 flex justify-end">
            <Button className="font-bold" onClick={() => setNewItemOpen(true)} data-testid="restaurant-menu-add-button">
              <Plus className="mr-1 h-4 w-4" /> Add dish
            </Button>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800">
            <table className="w-full text-sm" data-testid="restaurant-menu-table">
              <thead className="bg-accent text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Dish</th><th className="p-3">Price</th><th className="p-3">Category</th>
                  <th className="p-3">Available</th><th className="p-3">Surplus deal</th><th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(dash?.menu ?? []).map((m) => (
                  <tr key={m.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="p-3 font-semibold">{m.name}</td>
                    <td className="p-3 tabular-nums">{inr2(m.price)}{m.is_surplus && m.original_price ? <span className="ml-1 text-xs text-muted-foreground line-through">{inr2(m.original_price)}</span> : null}</td>
                    <td className="p-3 text-muted-foreground">{m.category}</td>
                    <td className="p-3">
                      <Checkbox checked={m.is_available} onCheckedChange={(c) => patchItem.mutate({ id: m.id, body: { is_available: c === true } })} data-testid="restaurant-menu-availability-toggle" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={m.is_surplus}
                          onCheckedChange={(c) => patchItem.mutate({ id: m.id, body: { is_surplus: c === true, original_price: c && !m.original_price ? m.price : m.original_price, surplus_qty: c && m.surplus_qty === 0 ? 5 : m.surplus_qty } })}
                          data-testid="restaurant-surplus-toggle"
                        />
                        {m.is_surplus && (
                          <Input
                            type="number" className="w-16" defaultValue={m.surplus_qty}
                            onBlur={(e) => patchItem.mutate({ id: m.id, body: { surplus_qty: Number(e.target.value) } })}
                            aria-label="Surplus quantity"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon-xs" variant="ghost" onClick={() => setEditItem(m)} aria-label="Edit price" data-testid="restaurant-menu-edit-button">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="analytics" data-testid="restaurant-analytics">
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
              <h3 className="font-heading font-bold">Revenue trend (7 days)</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.daily ?? []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e65100" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#e65100" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                    <XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#e65100" strokeWidth={2.5} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
              <h3 className="font-heading font-bold">Popular dishes</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.popular ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
                    <XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="name" width={120} fontSize={11} />
                    <Tooltip formatter={(value: number) => [`${value} sold`, "Orders"]} />
                    <Bar dataKey="orders" fill="#15803d" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200/80 bg-card p-5 lg:col-span-2 dark:border-stone-800">
              <h3 className="font-heading font-bold">Latest reviews</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2" data-testid="restaurant-reviews-list">
                {(analytics?.reviews ?? []).map((r, i) => (
                  <div key={i} className="rounded-xl bg-accent p-3 text-sm">
                    <p className="font-bold">{"★".repeat(r.rating)}<span className="text-stone-300">{"★".repeat(5 - r.rating)}</span> {r.name}</p>
                    <p className="mt-1 text-muted-foreground">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="impact" data-testid="restaurant-impact">
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
              <h3 className="font-heading font-bold">NGO community food sharing</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                List eligible surplus food for verified hunger-relief partners. Meals are temperature-stamped at pickup.
              </p>
              <Button className="mt-3 font-bold" onClick={() => setDonateOpen(true)} data-testid="restaurant-donate-surplus-btn">
                <HandHeart className="mr-1.5 h-4 w-4" /> Donate surplus meals
              </Button>
              <div className="mt-4 space-y-2" data-testid="restaurant-donations-list">
                {(donations ?? []).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-xl bg-accent p-3 text-sm">
                    <HandHeart className="h-4 w-4 text-green-600" />
                    <span>{d.meals} meals → {d.ngo_name}</span>
                    <Badge variant="secondary" className="ml-auto">{d.status}</Badge>
                  </div>
                ))}
                {donations && donations.length === 0 && <p className="text-sm text-muted-foreground">No donations yet.</p>}
              </div>
            </div>
            {dash && dash.stats.low_stock.length > 0 && (
              <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <h3 className="font-heading font-bold text-amber-800 dark:text-amber-300">Saver-hour suggestions</h3>
                <p className="mt-1 text-sm text-muted-foreground">These surplus dishes are running low — they close out soon:</p>
                <ul className="mt-2 list-disc pl-5 text-sm" data-testid="low-stock-list">
                  {dash.stats.low_stock.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add dish dialog */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent data-testid="add-dish-dialog">
          <DialogHeader><DialogTitle>Add a dish</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="nd-name">Name</Label><Input id="nd-name" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} data-testid="add-dish-name-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="nd-price">Price (₹)</Label><Input id="nd-price" type="number" value={newForm.price} onChange={(e) => setNewForm({ ...newForm, price: e.target.value })} data-testid="add-dish-price-input" /></div>
              <div className="space-y-1.5"><Label htmlFor="nd-cat">Category</Label><Input id="nd-cat" value={newForm.category} onChange={(e) => setNewForm({ ...newForm, category: e.target.value })} data-testid="add-dish-category-input" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="nd-desc">Description</Label><Input id="nd-desc" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} data-testid="add-dish-desc-input" /></div>
          </div>
          <DialogFooter>
            <Button className="font-bold" onClick={() => createItem.mutate()} disabled={createItem.isPending} data-testid="add-dish-save-button">Add to menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit price dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent data-testid="edit-dish-dialog">
          <DialogHeader><DialogTitle>Edit {editItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-price">Price (₹)</Label>
              <Input id="ed-price" type="number" defaultValue={editItem?.price} onBlur={(e) => setEditItem(editItem ? { ...editItem, price: Number(e.target.value) } : editItem)} data-testid="edit-dish-price-input" />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="font-bold"
              onClick={() => {
                if (editItem) patchItem.mutate({ id: editItem.id, body: { price: editItem.price } });
                setEditItem(null);
              }}
              data-testid="edit-dish-save-button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Donate dialog */}
      <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
        <DialogContent data-testid="donate-dialog">
          <DialogHeader><DialogTitle>Donate surplus meals</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="don-meals">How many meals?</Label>
              <Input id="don-meals" type="number" value={donateMeals} onChange={(e) => setDonateMeals(Number(e.target.value))} data-testid="donate-meals-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="don-ngo">NGO partner</Label>
              <Select value={donateNgo} onValueChange={(v: string) => setDonateNgo(v)}>
                <SelectTrigger id="don-ngo" data-testid="donate-ngo-select"><SelectValue>{donateNgo}</SelectValue></SelectTrigger>
                <SelectContent>{NGOS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button className="font-bold" onClick={() => donate.mutate()} disabled={donate.isPending} data-testid="donate-confirm-button">Confirm donation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
