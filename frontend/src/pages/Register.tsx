import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, Store, UtensilsCrossed, UserRound } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ROLES = [
  { key: "customer", label: "Customer", icon: UserRound, blurb: "Order food, join groups, subscribe to tiffins" },
  { key: "restaurant", label: "Restaurant", icon: Store, blurb: "Run a kitchen, manage menus & orders" },
  { key: "delivery", label: "Delivery Partner", icon: Bike, blurb: "Earn with batched, optimized routes" },
] as const;

const HOME_FOR: Record<string, string> = {
  customer: "/",
  restaurant: "/dashboard/restaurant",
  delivery: "/dashboard/delivery",
};

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>("customer");
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", address: "",
    restaurant_name: "", cuisines: "North Indian", area: "", vehicle: "Bike",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const register = useMutation({
    mutationFn: () =>
      apiPost<User>("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        phone: form.phone,
        address: form.address,
        ...(role === "restaurant"
          ? { restaurant_name: form.restaurant_name, cuisines: form.cuisines.split(",").map((c) => c.trim()).filter(Boolean), area: form.area }
          : {}),
        ...(role === "delivery" ? { vehicle: form.vehicle } : {}),
      }),
    onSuccess: async (user) => {
      beginSession();
      await queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => apiGet<User | null>("/auth/me") });
      toast.success(`Welcome to SmartBite, ${user.name.split(" ")[0]}!`);
      navigate(HOME_FOR[user.role] ?? "/", { replace: true });
    },
    onError: (err) => {
      const detail = (err as { body?: { detail?: string } }).body?.detail;
      toast.error(typeof detail === "string" ? detail : "Registration failed — check the details");
    },
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-center bg-stone-950 p-10 text-white lg:flex">
        <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight">
          Join the ecosystem that feeds people, not landfills.
        </h1>
        <ul className="mt-8 space-y-4 text-sm text-stone-300">
          {[
            "Budget-first discovery — meals that fit your wallet, taxes included",
            "Surplus rescue deals every evening before kitchens close",
            "Group orders with per-person bill splits",
            "Tiffin subscriptions for the whole week",
          ].map((line) => (
            <li key={line} className="flex items-start gap-3">
              <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight" data-testid="register-title">Create your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick your side of the ecosystem.</p>

          <div className="mt-4 grid gap-2" data-testid="register-role-select">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  role === r.key ? "border-primary bg-orange-50/60 dark:bg-orange-950/20" : "border-stone-200 hover:border-primary/50 dark:border-stone-800",
                )}
                data-testid="register-role-option"
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", role === r.key ? "bg-primary text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800")}>
                  <r.icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.blurb}</span>
                </span>
              </button>
            ))}
          </div>

          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              register.mutate();
            }}
            data-testid="register-form"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-name">Full name</Label>
                <Input id="r-name" value={form.name} onChange={set("name")} required data-testid="register-name-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-phone">Phone</Label>
                <Input id="r-phone" value={form.phone} onChange={set("phone")} placeholder="+91…" data-testid="register-phone-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-email">Email</Label>
              <Input id="r-email" type="email" value={form.email} onChange={set("email")} required data-testid="register-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-password">Password (min 6 chars)</Label>
              <Input id="r-password" type="password" value={form.password} onChange={set("password")} required minLength={6} data-testid="register-password-input" />
            </div>

            {role === "customer" && (
              <div className="space-y-1.5">
                <Label htmlFor="r-address">Delivery address</Label>
                <Input id="r-address" value={form.address} onChange={set("address")} placeholder="Flat, street, area, Bengaluru" data-testid="register-address-input" />
              </div>
            )}
            {role === "restaurant" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="r-rest">Restaurant name</Label>
                  <Input id="r-rest" value={form.restaurant_name} onChange={set("restaurant_name")} required data-testid="register-restaurant-name-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-cuisines">Cuisines (comma sep.)</Label>
                    <Input id="r-cuisines" value={form.cuisines} onChange={set("cuisines")} data-testid="register-cuisines-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-area">Area</Label>
                    <Input id="r-area" value={form.area} onChange={set("area")} placeholder="Indiranagar" data-testid="register-area-input" />
                  </div>
                </div>
              </>
            )}
            {role === "delivery" && (
              <div className="space-y-1.5">
                <Label htmlFor="r-vehicle">Vehicle</Label>
                <Input id="r-vehicle" value={form.vehicle} onChange={set("vehicle")} placeholder="Bike / EV Scooter / Cycle" data-testid="register-vehicle-input" />
              </div>
            )}

            <Button type="submit" className="w-full font-bold" disabled={register.isPending} data-testid="register-submit-button">
              {register.isPending ? "Creating…" : `Join SmartBite as ${ROLES.find((r) => r.key === role)?.label}`}
            </Button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline" data-testid="register-login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
