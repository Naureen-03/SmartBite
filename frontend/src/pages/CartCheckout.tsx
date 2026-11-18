import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Bike, CreditCard, Leaf, Minus, Plus, ShoppingBag, Smartphone, Users, Wallet } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type { GroupOrder, Order, Restaurant } from "@/lib/types";
import { useCart } from "@/lib/cart";
import PriceBreakdown from "@/components/PriceBreakdown";
import DietMark from "@/components/DietMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { inr2, PAYMENT_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

const PACKAGING_FEE = 15;
const PLATFORM_FEE = 6;
const GST_RATE = 0.05;

const PAYMENTS = [
  { key: "upi", icon: Smartphone },
  { key: "card", icon: CreditCard },
  { key: "wallet", icon: Wallet },
  { key: "cod", icon: Banknote },
] as const;

function dateFor(slot: string): string | null {
  const now = new Date();
  if (slot === "evening") return now.toISOString().slice(0, 10);
  if (slot === "tomorrow") return new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  return null;
}

const SCHEDULE_LABELS: Record<string, string> = {
  now: "Now (standard 30–40 min)",
  evening: "Today · 8–9 PM dinner slot",
  tomorrow: "Tomorrow · 1–2 PM lunch slot",
};

export default function CartCheckout() {
  const cart = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<string>("upi");
  const [batching, setBatching] = useState(true);
  const [slot, setSlot] = useState("now");

  const rid = cart.restaurantId;
  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", rid],
    queryFn: () => apiGet<Restaurant>(`/restaurants/${rid}`),
    enabled: !!rid,
  });

  const pricing = useMemo(() => {
    const subtotal = cart.subtotal;
    const packaging = subtotal >= 599 ? 0 : PACKAGING_FEE;
    const baseFee = restaurant?.delivery_fee ?? 30;
    const delivery = Math.round(baseFee * (batching ? 0.7 : 1) * 100) / 100;
    const gst = Math.round(GST_RATE * (subtotal + packaging) * 100) / 100;
    const total = Math.round((subtotal + packaging + delivery + PLATFORM_FEE + gst) * 100) / 100;
    return { subtotal, packaging, delivery, gst, total, batchingDiscount: batching ? Math.round((baseFee - delivery) * 100) / 100 : 0 };
  }, [cart.subtotal, restaurant, batching]);

  const placeOrder = useMutation({
    mutationFn: () =>
      apiPost<Order>("/orders", {
        items: cart.lines.map((l) => ({
          item_id: l.item.id, name: l.item.name, price: l.item.price,
          qty: l.qty, diet: l.item.diet, image_url: l.item.image_url,
        })),
        restaurant_id: rid,
        address: address || me?.address || "",
        payment_method: payment,
        batching,
        scheduled_for: dateFor(slot),
      }),
    onSuccess: (order) => {
      cart.clear();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed! The kitchen has been pinged.");
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      const detail = (err as { body?: { detail?: string } }).body?.detail;
      toast.error(typeof detail === "string" ? detail : "Could not place the order");
    },
  });

  const createGroup = useMutation({
    mutationFn: () => apiPost<GroupOrder>("/groups", { restaurant_id: rid }),
    onSuccess: (g) => {
      toast.success(`Group order room ${g.code} created — share the code!`);
      navigate(`/groups/${g.code}`);
    },
    onError: () => toast.error("Sign in as a customer to start a group order"),
  });

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-8">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-heading text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Fill it with something delicious — or rescue a surplus deal.</p>
        <Button className="mt-6 font-bold" render={<Link to="/" />} data-testid="cart-empty-browse-button">Browse kitchens</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {cart.restaurantName || restaurant?.name} · one kitchen per order keeps food fresh and routes efficient.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Left column: items + details */}
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-3xl border border-stone-200/80 bg-card p-5 dark:border-stone-800" data-testid="cart-items">
            <h2 className="font-heading font-bold">Your items</h2>
            <div className="mt-3 space-y-3">
              {cart.lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-3 rounded-2xl border border-stone-100 p-3 dark:border-stone-800" data-testid="cart-line">
                  <img src={l.item.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                      <DietMark diet={l.item.diet} size={12} /> {l.item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{inr2(l.item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-primary px-2 py-1 text-white">
                    <button aria-label="Decrease" data-testid="cart-line-stepper-decrement" onClick={() => cart.setQty(l.item.id, l.qty - 1)}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="min-w-4 text-center text-sm font-bold" data-testid="cart-line-qty">{l.qty}</span>
                    <button aria-label="Increase" data-testid="cart-line-stepper-increment" onClick={() => cart.setQty(l.item.id, l.qty + 1)}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="w-20 text-right font-heading text-sm font-extrabold tabular-nums">{inr2(l.item.price * l.qty)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
            <h2 className="font-heading font-bold">Delivery details</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="co-address">Deliver to</Label>
                <Input id="co-address" value={address || me?.address || ""} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, area" data-testid="checkout-address-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-slot">Schedule</Label>
                <Select value={slot} onValueChange={(v: string) => setSlot(v)}>
                  <SelectTrigger id="co-slot" data-testid="schedule-slot-select">
                    <SelectValue>{SCHEDULE_LABELS[slot]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200/80 bg-card p-5 dark:border-stone-800">
            <h2 className="font-heading font-bold">Payment method</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="payment-methods">
              {PAYMENTS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPayment(p.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition-colors",
                    payment === p.key ? "border-primary bg-orange-50 text-primary dark:bg-orange-950/30" : "border-stone-200 text-muted-foreground hover:border-primary/50 dark:border-stone-800",
                  )}
                  data-testid={`payment-method-${p.key}`}
                >
                  <p.icon className="h-4.5 w-4.5" /> {PAYMENT_LABELS[p.key]}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-green-200/70 bg-green-50/60 p-5 dark:border-green-900/40 dark:bg-green-950/20" data-testid="eco-batching-card">
            <label className="flex items-start gap-3">
              <Checkbox checked={batching} onCheckedChange={(c) => setBatching(c === true)} data-testid="eco-batching-checkbox" />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-green-800 dark:text-green-300">
                  <Leaf className="h-4 w-4" /> Eco-batch my delivery
                  <Bike className="h-4 w-4" />
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-green-700/80 dark:text-green-400/80">
                  Combine with a neighbour's order within 500 m — saves {inr2(restaurant ? restaurant.delivery_fee * 0.3 : 9)} on
                  delivery and avoids 0.8 kg CO₂. Just a few minutes slower.
                </span>
              </span>
            </label>
          </section>

          <section className="rounded-3xl border border-stone-200/80 bg-card p-5 dark:border-stone-800" data-testid="group-order-card">
            <div className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-primary" />
              <h2 className="font-heading font-bold">Ordering with friends?</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Start a group room — everyone adds their own food from {cart.restaurantName || restaurant?.name}, then the host
              checks out and the bill splits per person.
            </p>
            <Button variant="outline" className="mt-3 font-bold" onClick={() => createGroup.mutate()} disabled={createGroup.isPending} data-testid="group-create-button">
              Start a group order room
            </Button>
          </section>
        </div>

        {/* Right column: transparent pricing + pay */}
        <div className="space-y-5 lg:col-span-2">
          <PriceBreakdown
            subtotal={pricing.subtotal}
            packagingFee={pricing.packaging}
            deliveryFee={pricing.delivery}
            platformFee={PLATFORM_FEE}
            gst={pricing.gst}
            batchingDiscount={pricing.batchingDiscount}
            total={pricing.total}
            batching={batching}
          />
          <Button
            size="lg"
            className="w-full font-bold"
            onClick={() => placeOrder.mutate()}
            disabled={placeOrder.isPending}
            data-testid="cart-checkout-button"
          >
            {placeOrder.isPending ? "Placing order…" : `Pay ${inr2(pricing.total)} · ${PAYMENT_LABELS[payment]}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground" data-testid="checkout-assurance">
            Simulated secure payment · full fee breakdown above is final
          </p>
        </div>
      </div>
    </div>
  );
}
