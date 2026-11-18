import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Search, ShoppingBag, Star } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MenuItem, Restaurant } from "@/lib/types";
import DishCard from "@/components/DishCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

const DIETS = [
  { key: "all", label: "Everything" },
  { key: "veg", label: "Veg" },
  { key: "egg", label: "Egg" },
  { key: "nonveg", label: "Non-veg" },
];

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const cart = useCart();
  const [diet, setDiet] = useState("all");
  const [menuQ, setMenuQ] = useState("");

  const { data: restaurant, isError: restError } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => apiGet<Restaurant>(`/restaurants/${id}`),
  });
  const { data: menu } = useQuery({
    queryKey: ["menu", id, diet],
    queryFn: () => apiGet<MenuItem[]>(`/restaurants/${id}/menu${diet !== "all" ? `?diet=${diet}` : ""}`),
  });

  const sections = useMemo(() => {
    const filtered = (menu ?? []).filter((m) => m.name.toLowerCase().includes(menuQ.toLowerCase()));
    const byCat = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      const list = byCat.get(item.category) ?? [];
      list.push(item);
      byCat.set(item.category, list);
    }
    return [...byCat.entries()];
  }, [menu, menuQ]);

  const cartHere = cart.restaurantId === id ? cart.count : 0;

  return (
    <div className="min-h-svh bg-background pb-28">
      {/* Hero */}
      <div className="relative h-64 md:h-80">
        <img src={restaurant?.image_url ?? ""} alt={restaurant?.name ?? ""} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-950/20" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl p-4 text-white md:p-8">
          {restError ? (
            <>
              <h1 className="font-heading text-3xl font-extrabold">Kitchen not found</h1>
              <Button variant="outline" size="sm" className="mt-3" render={<Link to="/" />}>Back to discovery</Button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl" data-testid="restaurant-title">{restaurant?.name ?? "…"}</h1>
                {restaurant?.is_pure_veg && <Badge className="border-0 bg-green-600 text-white">Pure Veg</Badge>}
              </div>
              <p className="mt-1 text-sm text-stone-200">{restaurant?.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1 font-bold" data-testid="restaurant-rating-badge">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {restaurant?.rating.toFixed(1)} ({restaurant?.rating_count})
                </span>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {restaurant ? restaurant.prep_time_mins + 12 : "—"} min</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {restaurant?.area}</span>
                <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold" data-testid="restaurant-fee-note">
                  {inr(restaurant?.delivery_fee ?? 0)} delivery · free with eco-batching
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky menu controls */}
      <div className="sticky top-16 z-30 border-b border-stone-200/80 bg-background/90 backdrop-blur-xl dark:border-stone-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
          <div className="relative w-44 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={menuQ} onChange={(e) => setMenuQ(e.target.value)} placeholder="Search the menu…" className="rounded-full pl-9" data-testid="menu-search-input" />
          </div>
          <div className="flex gap-1.5">
            {DIETS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDiet(d.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  diet === d.key ? "border-primary bg-primary text-white" : "border-stone-300 text-muted-foreground hover:border-primary",
                )}
                data-testid="menu-diet-chip"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu sections */}
      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 md:px-8">
        {sections.map(([cat, items]) => (
          <section key={cat}>
            <h2 className="font-heading text-lg font-extrabold tracking-tight text-amber-900 dark:text-amber-300">{cat}</h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2" data-testid="menu-section">
              {items.map((item) => (
                <DishCard key={item.id} item={item} restaurantName={restaurant?.name ?? ""} />
              ))}
            </div>
          </section>
        ))}
        {menu && sections.length === 0 && (
          <p className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
            No dishes match this filter — the kitchen may have sold out for today.
          </p>
        )}
      </div>

      {/* Sticky cart bar */}
      {cartHere > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-3 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-2">
            <p className="text-sm font-semibold" data-testid="cart-bar-count">
              {cartHere} item{cartHere > 1 ? "s" : ""} · {inr(cart.subtotal)}
            </p>
            <Button className="ml-auto font-bold" render={<Link to="/checkout" />} data-testid="cart-bar-view-cart-button">
              <ShoppingBag className="mr-1.5 h-4 w-4" /> View cart & checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
