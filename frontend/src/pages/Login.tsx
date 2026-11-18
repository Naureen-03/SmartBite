import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UtensilsCrossed } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { role: "customer", label: "Customer", email: "customer@smartbite.in" },
  { role: "restaurant", label: "Restaurant Partner", email: "owner@smartbite.in" },
  { role: "delivery", label: "Delivery Hero", email: "rider@smartbite.in" },
  { role: "admin", label: "Platform Admin", email: "admin@smartbite.in" },
];

const HOME_FOR: Record<string, string> = {
  customer: "/",
  restaurant: "/dashboard/restaurant",
  delivery: "/dashboard/delivery",
  admin: "/dashboard/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("customer@smartbite.in");
  const [password, setPassword] = useState("smartbite123");

  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiPost<User>("/auth/login", body),
    onSuccess: async (user) => {
      beginSession();
      // Warm the role-aware shell before navigating.
      await queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => apiGet<User | null>("/auth/me") });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(HOME_FOR[user.role] ?? "/", { replace: true });
    },
    onError: (err) => {
      const message = (err as { body?: { detail?: string } }).body?.detail ?? "Login failed";
      toast.error(message);
    },
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-stone-950 p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2" data-testid="auth-brand-link">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"><UtensilsCrossed className="h-5 w-5" /></span>
          <span className="font-heading text-xl font-extrabold">Smart<span className="text-primary">Bite</span></span>
        </Link>
        <div>
          <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight">
            The smarter food ecosystem.<br />Affordable, transparent, zero waste.
          </h1>
          <div className="mt-8 grid grid-cols-3 gap-4" data-testid="platform-stats">
            {[
              ["6", "verified kitchens"],
              ["48k+", "meals delivered"],
              ["12t", "food waste saved"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-2xl bg-stone-900 p-4">
                <p className="font-heading text-2xl font-extrabold text-primary">{n}</p>
                <p className="text-xs text-stone-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-stone-500">FSSAI verified · Secure httpOnly sessions · Transparent ₹ pricing</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight" data-testid="login-title">Sign in to SmartBite</h2>
          <p className="mt-1 text-sm text-muted-foreground">One ecosystem — order, cook, deliver or govern.</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate({ email, password });
            }}
            data-testid="login-form"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" />
            </div>
            <Button type="submit" className="w-full font-bold" disabled={login.isPending} data-testid="login-submit-button">
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">One-tap demo roles</p>
            <div className="mt-2 grid grid-cols-2 gap-2" data-testid="login-demo-roles">
              {DEMO_ACCOUNTS.map((d) => (
                <Button
                  key={d.role}
                  variant="outline"
                  size="sm"
                  onClick={() => login.mutate({ email: d.email, password: "smartbite123" })}
                  data-testid="login-demo-role-button"
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline" data-testid="login-register-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
