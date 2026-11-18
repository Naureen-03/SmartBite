import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, CloudSun, Percent, Search, Sparkles, Timer, Wallet } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type { BudgetLine, MetaInfo, RecItem, RecsResponse, Restaurant, SurplusDeal } from "@/lib/types";
import RestaurantCard from "@/components/RestaurantCard";
import DietMark from "@/components/DietMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, inr2, minutesUntil } from "@/lib/format";

const CUISINES = ["All", "North Indian", "Biryani", "Italian", "Asian", "Healthy", "Street Food"];

type Persona = "all" | "protein" | "light" | "saver";
const PERSONAS: { key: Persona; label: string }[] = [
  { key: "all", label: "Picked for you" },
  { key: "protein", label: "High protein (25g+)" },
  { key: "light", label: "Low calorie (<450)" },
  { key: "saver", label: "Saver deals" },
];

function matchesPersona(item: RecItem, persona: Persona): boolean {
  if (persona === "protein") return item.protein >= 25;
  if (persona === "light") return item.calories > 0 && item.calories < 450;
  if (persona === "saver") return item.is_surplus;
  return true;
}

export default function Home() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState(300);
  const [budgetGo, setBudgetGo] = useState<number | null>(null);
  const [persona, setPersona] = useState<Persona>("all");

  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => apiGet<MetaInfo>("/discover/meta") });
  const { data: recs } = useQuery({
    queryKey: ["recs", me?.id],
    queryFn: () => apiGet<RecsResponse>("/discover/recommendations"),
  });
  const { data: surplus } = useQuery({ queryKey: ["surplus"], queryFn: () => apiGet<SurplusDeal[]>("/discover/surplus") });
  const { data: restaurants } = useQuery({
    queryKey: ["restaurants", q, cuisine, vegOnly],
    queryFn: () =>
      apiGet<Restaurant[]>(
        `/restaurants?q=${encodeURIComponent(q)}&cuisine=${cuisine === "All" ? "" : cuisine}${vegOnly ? "&diet=veg" : ""}`,
      ),
  });
  const { data: budgetItems } = useQuery({
    queryKey: ["budget", budgetGo],
    queryFn: () => apiGet<BudgetLine[]>(`/discover/budget?amount=${budgetGo}`),
    enabled: budgetGo !== null,
  });

  const shownRecs = useMemo(() => (recs?.items ?? []).filter((r) => matchesPersona(r, persona)), [recs, persona]);

  if (me && me.role !== "customer") {
    const dest =
      me.role === "restaurant" ? "/dashboard/restaurant" : me.role === "delivery" ? "/dashboard/delivery" : "/dashboard/admin";
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="min-h-svh bg-background">
      {/* ---------- Hero: greeting + context + budget finder ---------- */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-8 md:px-8 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-orange-200/60 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 md:p-8 lg:col-span-8 dark:border-orange-900/30"
          data-testid="budget-finder-hero"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl" data-testid="home-greeting">
              {meta ? `${meta.greeting}, ${me?.name?.split(" ")[0] ?? "foodie"}!` : "Hungry, foodie?"}
            </h1>
            {meta && (
              <Badge variant="outline" className="gap-1.5 rounded-full bg-white/70" data-testid="weather-chip">
                <CloudSun className="h-3.5 w-3.5" /> {meta.weather} · {meta.time_of_day} · {meta.city}
              </Badge>
            )}
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Set your budget — we find meals where food, delivery, platform fee AND GST all fit inside it.
            No surprises at the door, ever.
          </p>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400" htmlFor="budget-slider">
                <Wallet className="h-3.5 w-3.5" /> My budget
                <span className="ml-auto font-heading text-lg font-extrabold normal-case tracking-tight text-foreground" data-testid="budget-amount-label">
                  {inr(budgetAmount)}
                </span>
              </label>
              <input
                id="budget-slider"
                type="range"
                min={100}
                max={1000}
                step={10}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(Number(e.target.value))}
                className="mt-2 w-full accent-orange-600"
                data-testid="budget-amount-slider"
              />
            </div>
            <Button
              size="lg"
              className="font-bold"
              onClick={() => setBudgetGo(budgetAmount)}
              data-testid="budget-find-meals-button"
            >
              Find meals within {inr(budgetAmount)} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          {budgetGo !== null && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                Everything below is {inr(budgetGo)} all-inclusive
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="budget-results-grid">
                {(budgetItems ?? []).map((b) => (
                  <button
                    key={b.item_id}
                    onClick={() => navigate(`/restaurants/${b.restaurant_id}`)}
                    className="rounded-2xl border border-stone-200/80 bg-card p-3 text-left transition-shadow hover:shadow-md dark:border-stone-800"
                    data-testid="budget-result-card"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={b.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-bold"><DietMark diet={b.diet} size={12} /> {b.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.restaurant_name} · {b.area}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground" data-testid="budget-result-breakdown">
                      Food {inr(b.price)} + packaging {inr(b.breakdown.packaging)} + delivery {inr(b.breakdown.delivery)} + fee {inr(b.breakdown.platform_fee)} + GST {inr(b.breakdown.gst)}
                    </p>
                    <p className="mt-1 font-heading text-sm font-extrabold text-green-700 dark:text-green-400">
                      {inr2(b.total_price)} all-in — fits!
                    </p>
                  </button>
                ))}
                {budgetItems && budgetItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing fits {inr(budgetGo)} right now — nudge the slider up a touch.</p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* ---------- AI recommendation engine ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-stone-200/80 bg-card p-6 shadow-sm lg:col-span-4 dark:border-stone-800"
          data-testid="ai-recommendation-card"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="font-heading text-base font-bold">Today's intelligent picks</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Scored on your order history, taste profile, the {meta?.weather?.toLowerCase() ?? "current"} weather and
            the hour — {meta?.time_of_day ?? "right now"}.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="ai-recommendation-chips">
            {PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPersona(p.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  persona === p.key ? "border-primary bg-primary text-white" : "border-stone-300 text-muted-foreground hover:border-primary"
                }`}
                data-testid="ai-recommendation-chip"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3" data-testid="recommendation-list">
            {shownRecs.slice(0, 5).map((r) => (
              <button
                key={r.item_id}
                onClick={() => navigate(`/restaurants/${r.restaurant_id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition-colors hover:border-stone-200 hover:bg-accent/50 dark:hover:border-stone-800"
                data-testid="recommendation-card"
              >
                <img src={r.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold"><DietMark diet={r.diet} size={12} /> {r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.restaurant_name} · {inr(r.price)}</p>
                  {r.reasons[0] && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                      <Sparkles className="h-2.5 w-2.5" /> {r.reasons[0]}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {shownRecs.length === 0 && <p className="text-sm text-muted-foreground">Loading smart picks…</p>}
          </div>
        </motion.div>
      </section>

      {/* ---------- Surplus food rescue rail ---------- */}
      <section className="mx-auto mt-8 max-w-7xl px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-amber-300/60 bg-amber-500/10 p-6 dark:border-amber-900/40"
          data-testid="surplus-rail"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Percent className="h-4 w-4" />
            </span>
            <h2 className="font-heading text-base font-bold">Saver Hour — rescue surplus meals before closing</h2>
            <p className="ml-auto hidden text-xs font-medium text-amber-800 sm:block dark:text-amber-300">
              Restaurants clear extra stock at up to 60% off. Zero food waste.
            </p>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2" data-testid="surplus-deal-list">
            {(surplus ?? []).map((s) => (
              <div
                key={s.item_id}
                className="w-60 shrink-0 overflow-hidden rounded-2xl border border-amber-200/70 bg-card shadow-xs dark:border-amber-900/40"
                data-testid="surplus-deal-card"
              >
                <div className="relative h-28">
                  <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute left-2 top-2 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {Math.round((1 - s.price / s.original_price) * 100)}% OFF
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.restaurant_name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-heading font-extrabold">{inr(s.price)}</span>
                      <span className="ml-1 text-xs text-muted-foreground line-through">{inr(s.original_price)}</span>
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                      <Timer className="h-3 w-3" /> {minutesUntil(s.closes_at)}m left
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400" data-testid="surplus-qty-note">
                    Only {s.surplus_qty} left before {s.closes_at} close
                  </p>
                  <Button size="sm" variant="secondary" className="mt-2 w-full font-bold" onClick={() => navigate(`/restaurants/${s.restaurant_id}`)} data-testid="surplus-rescue-button">
                    Rescue this meal
                  </Button>
                </div>
              </div>
            ))}
            {surplus && surplus.length === 0 && (
              <p className="text-sm text-muted-foreground">No surplus deals right now — kitchens are fully claimed today.</p>
            )}
          </div>
        </motion.div>
      </section>

      {/* ---------- Discovery: search + filters + restaurant grid ---------- */}
      <section className="mx-auto mt-10 max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">Restaurants near you</h2>
          <div className="relative md:ml-auto md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search restaurants…"
              className="rounded-full pl-9"
              data-testid="restaurant-search-input"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                cuisine === c ? "border-primary bg-primary text-white" : "border-stone-300 text-muted-foreground hover:border-primary"
              }`}
              data-testid="cuisine-filter-chip"
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              vegOnly ? "border-green-600 bg-green-600 text-white" : "border-green-600/50 text-green-700 hover:bg-green-50 dark:text-green-400"
            }`}
            data-testid="diet-filter-chip"
          >
            ● Pure Veg only
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="restaurant-grid">
          {(restaurants ?? []).map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
        </div>
        {restaurants && restaurants.length === 0 && (
          <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground" data-testid="restaurant-empty">
            No restaurants match — try a different cuisine or clear the search.
          </div>
        )}
      </section>
    </div>
  );
}
