import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeIndianRupee, Bike, LogOut, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import { useMe } from "@/lib/hooks";
import { endSession } from "@/lib/session";

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  customer: { label: "Foodie", className: "bg-orange-100 text-orange-800" },
  restaurant: { label: "Restaurant Partner", className: "bg-green-100 text-green-800" },
  delivery: { label: "Delivery Hero", className: "bg-sky-100 text-sky-800" },
  admin: { label: "Platform Admin", className: "bg-slate-200 text-slate-800" },
};

export default function Navbar() {
  const { data: me } = useMe();
  const cart = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const roleBadge = me ? ROLE_BADGE[me.role] : null;

  const handleLogout = async () => {
    queryClient.clear();
    await endSession("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/85 backdrop-blur-xl dark:border-stone-800/80 dark:bg-[#121110]/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight">
            Smart<span className="text-primary">Bite</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {(!me || me.role === "customer") && (
            <>
              <Button variant="ghost" size="sm" render={<Link to="/" />} data-testid="nav-home-link">
                Discover
              </Button>
              <Button variant="ghost" size="sm" render={<Link to="/orders" />} data-testid="nav-orders-link">
                My Orders
              </Button>
              <Button variant="ghost" size="sm" render={<Link to="/subscriptions" />} data-testid="nav-subs-link">
                Subscriptions
              </Button>
            </>
          )}
          {me?.role === "restaurant" && (
            <Button variant="ghost" size="sm" render={<Link to="/dashboard/restaurant" />} data-testid="nav-restaurant-dash-link">
              <Store className="mr-1.5 h-4 w-4" /> Restaurant Dashboard
            </Button>
          )}
          {me?.role === "delivery" && (
            <Button variant="ghost" size="sm" render={<Link to="/dashboard/delivery" />} data-testid="nav-delivery-dash-link">
              <Bike className="mr-1.5 h-4 w-4" /> Delivery Cockpit
            </Button>
          )}
          {me?.role === "admin" && (
            <Button variant="ghost" size="sm" render={<Link to="/dashboard/admin" />} data-testid="nav-admin-dash-link">
              <BadgeIndianRupee className="mr-1.5 h-4 w-4" /> Admin Console
            </Button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {roleBadge && (
            <Badge data-testid="nav-role-badge" className={`hidden sm:inline-flex ${roleBadge.className}`}>
              {me?.name} · {roleBadge.label}
            </Badge>
          )}
          {(!me || me.role === "customer") && (
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-full"
              onClick={() => navigate("/checkout")}
              aria-label="Cart"
              data-testid="nav-cart-button"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cart.count > 0 && (
                <span
                  data-testid="nav-cart-count"
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white"
                >
                  {cart.count}
                </span>
              )}
            </Button>
          )}
          {me ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="nav-logout-button"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link to="/login" />} data-testid="nav-login-link">
                Sign in
              </Button>
              <Button size="sm" render={<Link to="/register" />} data-testid="nav-register-link">
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
