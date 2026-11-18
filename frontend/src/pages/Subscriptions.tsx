import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Pause, Play, Repeat2 } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Restaurant, Subscription } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAYS, inr2 } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Subscriptions() {
  const queryClient = useQueryClient();
  const [rid, setRid] = useState("");
  const [meal, setMeal] = useState("lunch");
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants", "plan"],
    queryFn: () => apiGet<Restaurant[]>("/restaurants"),
  });
  const { data: subs } = useQuery({ queryKey: ["subs"], queryFn: () => apiGet<Subscription[]>("/subs/mine") });

  const planRestaurants = (restaurants ?? []).filter((r) => r.plan_price > 0);
  const selected = planRestaurants.find((r) => r.id === rid) ?? planRestaurants[0];
  const weekly = (days.length || 0) * (selected?.plan_price ?? 0);

  const create = useMutation({
    mutationFn: () => apiPost<Subscription>("/subs", { restaurant_id: selected.id, meal, days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subs"] });
      toast.success("Tiffin plan active — meals will auto-arrive on your days");
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Could not subscribe"),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch<Subscription>(`/subs/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subs"] }),
  });

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Tiffin subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Schedule the week once — lunch or dinner arrives on your chosen days. Skip any day with one tap.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="rounded-3xl border border-stone-200/80 bg-card p-6 lg:col-span-3 dark:border-stone-800" data-testid="subscription-planner">
          <h2 className="font-heading font-bold">Build your week</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select value={selected?.id ?? ""} onValueChange={(v: string) => setRid(v)}>
              <SelectTrigger data-testid="sub-restaurant-select"><SelectValue>{selected?.name ?? "Choose a kitchen"}</SelectValue></SelectTrigger>
              <SelectContent>
                {planRestaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} · {inr2(r.plan_price)}/meal</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={meal} onValueChange={(v: string) => setMeal(v)}>
              <SelectTrigger data-testid="sub-meal-select">
                <SelectValue>{meal === "lunch" ? "Lunch · 12–2 PM" : "Dinner · 7–9 PM"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch">Lunch · 12–2 PM</SelectItem>
                <SelectItem value="dinner">Dinner · 7–9 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5" data-testid="sub-day-grid">
            {DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "rounded-xl border py-2.5 text-center text-xs font-bold transition-colors",
                    on ? "border-primary bg-primary text-white" : "border-stone-200 text-muted-foreground hover:border-primary dark:border-stone-800",
                  )}
                  data-testid="sub-day-chip"
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-accent p-4">
            <p className="text-sm">
              <span className="font-heading font-extrabold" data-testid="sub-weekly-total">{inr2(weekly)}</span>
              <span className="text-muted-foreground"> / week · {days.length} meals · {meal}</span>
            </p>
            <Button className="font-bold" onClick={() => create.mutate()} disabled={create.isPending || days.length === 0} data-testid="sub-create-button">
              <Repeat2 className="mr-1.5 h-4 w-4" /> Subscribe
            </Button>
          </div>
        </section>

        <section className="lg:col-span-2" data-testid="my-subscriptions">
          <h2 className="font-heading font-bold">Your plans</h2>
          <div className="mt-3 space-y-3">
            {(subs ?? []).map((s) => (
              <div key={s.id} className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="subscription-card">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">{s.restaurant_name}</p>
                  <Badge variant={s.status === "active" ? "default" : "secondary"} className="ml-auto" data-testid="subscription-status">
                    {s.status}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {s.meal} · {s.days.join(", ")} · {inr2(s.price_per_meal)}/meal
                </p>
                <div className="mt-3 flex gap-2">
                  {s.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "paused" })} data-testid="sub-pause-button">
                      <Pause className="mr-1 h-3.5 w-3.5" /> Pause
                    </Button>
                  ) : s.status === "paused" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "active" })} data-testid="sub-resume-button">
                      <Play className="mr-1 h-3.5 w-3.5" /> Resume
                    </Button>
                  ) : null}
                  {s.status !== "cancelled" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: s.id, status: "cancelled" })} data-testid="sub-cancel-button">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {subs && subs.length === 0 && (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No plans yet — subscribe to a homestyle tiffin and never think about lunch again.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
