import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CartProvider } from "@/lib/cart";
import { useMe } from "@/lib/hooks";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import RestaurantDetail from "@/pages/RestaurantDetail";
import CartCheckout from "@/pages/CartCheckout";
import Orders from "@/pages/Orders";
import OrderTracking from "@/pages/OrderTracking";
import GroupOrderPage from "@/pages/GroupOrder";
import Subscriptions from "@/pages/Subscriptions";
import RestaurantDashboard from "@/pages/RestaurantDashboard";
import DeliveryDashboard from "@/pages/DeliveryDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";

const HOME_FOR: Record<string, string> = {
  customer: "/",
  restaurant: "/dashboard/restaurant",
  delivery: "/dashboard/delivery",
  admin: "/dashboard/admin",
};

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) {
    return <div className="p-24 text-center text-muted-foreground" data-testid="auth-gate-loading">Loading…</div>;
  }
  if (!me) return <Navigate to="/login" replace />;
  if (!roles.includes(me.role)) return <Navigate to={HOME_FOR[me.role] ?? "/"} replace />;
  return <>{children}</>;
}

function Chrome({ children }: { children: ReactNode }) {
  const location = useLocation();
  const bare = location.pathname === "/login" || location.pathname === "/register";
  if (bare) return <>{children}</>;
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <CartProvider>
      <Chrome>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/restaurants/:id" element={<RestaurantDetail />} />
          <Route path="/checkout" element={<RequireRole roles={["customer"]}><CartCheckout /></RequireRole>} />
          <Route path="/orders" element={<RequireRole roles={["customer"]}><Orders /></RequireRole>} />
          <Route path="/orders/:id" element={<RequireRole roles={["customer", "restaurant", "delivery", "admin"]}><OrderTracking /></RequireRole>} />
          <Route path="/groups/:code" element={<RequireRole roles={["customer", "restaurant", "delivery", "admin"]}><GroupOrderPage /></RequireRole>} />
          <Route path="/subscriptions" element={<RequireRole roles={["customer"]}><Subscriptions /></RequireRole>} />
          <Route path="/dashboard/restaurant" element={<RequireRole roles={["restaurant"]}><RestaurantDashboard /></RequireRole>} />
          <Route path="/dashboard/delivery" element={<RequireRole roles={["delivery"]}><DeliveryDashboard /></RequireRole>} />
          <Route path="/dashboard/admin" element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Chrome>
      <Toaster position="bottom-right" richColors />
    </CartProvider>
  );
}
