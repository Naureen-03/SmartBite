import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Users } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type { GroupCheckoutResp, GroupOrder as Group, MenuItem, Order, Restaurant } from "@/lib/types";
import DietMark from "@/components/DietMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr2, PAYMENT_LABELS } from "@/lib/format";

type SplitMode = "itemized" | "equal" | "host";

export default function GroupOrderPage() {
  const { code } = useParams<{ code: string }>();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [payment, setPayment] = useState("upi");
  const [splitMode, setSplitMode] = useState<SplitMode>("itemized");

  const { data: group, isError: groupError } = useQuery({
    queryKey: ["group", code],
    queryFn: () => apiGet<Group>(`/groups/${code}`),
    refetchInterval: 6000,
    enabled: !!me,
  });
  const rid = group?.restaurant_id;
  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", rid],
    queryFn: () => apiGet<Restaurant>(`/restaurants/${rid}`),
    enabled: !!rid,
  });
  const { data: menu } = useQuery({
    queryKey: ["menu", rid, "all"],
    queryFn: () => apiGet<MenuItem[]>(`/restaurants/${rid}/menu`),
    enabled: !!rid,
  });

  const addItem = useMutation({
    mutationFn: (itemId: string) => apiPost<Group>(`/groups/${code}/items`, { item_id: itemId, qty: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", code] });
      toast.success("Added to your group cart");
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Could not add item"),
  });

  const checkout = useMutation({
    mutationFn: () =>
      apiPost<GroupCheckoutResp>(`/groups/${code}/checkout`, { payment_method: payment, batching: false, address: me?.address ?? "" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["group", code] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Group order placed — ${res.split.length} people eating together!`);
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Checkout failed"),
  });

  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Users className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-heading text-2xl font-extrabold">Group room {code}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to add your share of the order — everyone pays only for their own food.</p>
        <Button className="mt-6 font-bold" render={<Link to="/login" />} data-testid="group-signin-button">Sign in to join</Button>
      </div>
    );
  }

  if (groupError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-extrabold">Room not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Group {code} doesn't exist — ask the host for the 6-digit code.</p>
        <Button className="mt-6 font-bold" render={<Link to="/" />}>Back to discovery</Button>
      </div>
    );
  }

  const isHost = group?.host_id === me.id;
  const ordered = group?.status === "ordered";
  const members = group?.members ?? [];
  const itemsTotal = members.reduce((n, m) => n + m.total, 0);
  const fees = (restaurant?.delivery_fee ?? 30) + 15 + 6;
  const gst = Math.round(0.05 * (itemsTotal + 15) * 100) / 100;
  const grand = Math.round((itemsTotal + fees + gst) * 100) / 100;
  const splitFor = (mTotal: number) =>
    splitMode === "equal" ? grand / Math.max(1, members.length)
    : splitMode === "host" ? 0
    : itemsTotal > 0 ? Math.round(((mTotal / itemsTotal) * (grand - mTotal) + mTotal) * 100) / 100 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight" data-testid="group-title">{group?.restaurant_name} · group room</h1>
        <Badge className="border-0 bg-stone-900 text-white" data-testid="group-code-display">Code {group?.code}</Badge>
        {ordered && <Badge className="border-0 bg-green-600 text-white" data-testid="group-ordered-badge">Ordered!</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Share code <span className="font-bold text-foreground">{group?.code}</span> with friends — each person adds their own food and pays their own share.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2" data-testid="group-members-panel">
          <h2 className="font-heading font-bold">The table ({members.length})</h2>
          <div className="mt-3 space-y-3">
            {members.map((m) => (
              <div key={m.user_id} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="group-member-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">
                    {m.name.slice(0, 2).toUpperCase()}
                  </span>
                  <p className="text-sm font-bold">{m.name}</p>
                  {m.user_id === group?.host_id && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  <span className="ml-auto font-heading text-sm font-extrabold">{inr2(m.total)}</span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground" data-testid="group-member-items">
                  {m.items.map((i) => (
                    <li key={i.item_id}>{i.qty}× {i.name} <span className="tabular-nums">({inr2(i.price * i.qty)})</span></li>
                  ))}
                  {m.items.length === 0 && <li>Still deciding…</li>}
                </ul>
              </div>
            ))}
          </div>

          {!ordered && isHost && (
            <div className="mt-5 rounded-3xl border border-stone-200/80 bg-card p-5 dark:border-stone-800" data-testid="group-host-checkout-panel">
              <h3 className="font-heading font-bold">Host checkout</h3>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Food total</span><span className="tabular-nums">{inr2(itemsTotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery + packaging + fee</span><span className="tabular-nums">{inr2(fees)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span className="tabular-nums">{inr2(gst)}</span></div>
                <div className="flex justify-between border-t pt-2 font-heading font-extrabold"><span>Grand total</span><span className="tabular-nums" data-testid="group-grand-total">{inr2(grand)}</span></div>
              </div>
              <div className="mt-3 space-y-2">
                <Select value={splitMode} onValueChange={(v: string) => setSplitMode(v as SplitMode)} data-testid="split-mode-select">
                  <SelectTrigger><SelectValue>{splitMode === "equal" ? "Split equally" : splitMode === "host" ? "Host pays everything" : "Split by items"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="itemized">Split by items</SelectItem>
                    <SelectItem value="equal">Split equally</SelectItem>
                    <SelectItem value="host">Host pays everything</SelectItem>
                  </SelectContent>
                </Select>
                {splitMode !== "host" && (
                  <ul className="rounded-xl bg-accent p-3 text-xs" data-testid="split-preview">
                    {members.map((m) => (
                      <li key={m.user_id} className="flex justify-between py-0.5">
                        <span>{m.name} pays</span><span className="font-bold tabular-nums">{inr2(splitFor(m.total))}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Select value={payment} onValueChange={(v: string) => setPayment(v)}>
                  <SelectTrigger data-testid="group-payment-select"><SelectValue>{PAYMENT_LABELS[payment]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="w-full font-bold" onClick={() => checkout.mutate()} disabled={checkout.isPending} data-testid="group-host-checkout-button">
                  {checkout.isPending ? "Placing…" : `Pay ${inr2(grand)} for the table`}
                </Button>
              </div>
            </div>
          )}

          {ordered && group?.order_id && (
            <Button className="mt-5 w-full font-bold" render={<Link to={`/orders/${group.order_id}`} />} data-testid="group-track-order-button">
              Track the group order
            </Button>
          )}
        </section>

        <section className="lg:col-span-3">
          <h2 className="font-heading font-bold">Add your food</h2>
          <p className="text-xs text-muted-foreground">Tap to add — it lands in YOUR cart within the shared order.</p>
          {ordered ? (
            <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
              This room has ordered. Start another room from the checkout page.
            </p>
          ) : (
            <div className="mt-3 grid gap-2.5" data-testid="group-menu-list">
              {(menu ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-card p-3 dark:border-stone-800">
                  <img src={item.image_url} alt="" className="h-11 w-11 rounded-lg object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold"><DietMark diet={item.diet} size={12} /> {item.name}</p>
                    <p className="text-xs text-muted-foreground">{inr2(item.price)} · {item.calories} kcal</p>
                  </div>
                  <Button size="sm" variant="outline" className="font-bold" onClick={() => addItem.mutate(item.id)} disabled={addItem.isPending} data-testid="group-add-item-button">
                    Add mine
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
