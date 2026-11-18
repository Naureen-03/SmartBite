SmartBite — app spec (living)
What it is
A food-delivery + order-management ecosystem (India locale, ₹) with 4 roles: customer, restaurant, delivery, admin. Differentiators implemented end-to-end: budget-based discovery (fees+tax included), heuristic AI recommendations (history/prefs/diet/weather/time-of-day/calories), group ordering + bill split, surplus food rescue deals, transparent server-side price ledger, scheduled tiffin subscriptions, allergen/ingredient transparency, eco-batched delivery, NGO community food sharing, and a 5-stage freshness tracker with simulated courier route.

Stack & layout
Backend: FastAPI (backend/server.py mounts 9 routers on api_router, prefix /api), MongoDB via motor (lib/db.py), JWT httpOnly-cookie sessions (lib/auth.py, cookie smartbite_session, secret JWT_SECRET in backend/.env).
Frontend: React 19 + TS strict + Tailwind v4 + shadcn (base-nova), TanStack Query, recharts via @/lib/recharts, theme in src/index.css (Plus Jakarta Sans / DM Sans, warm cream #FAF7F2, saffron #E65100, basil #15803D).
Data model (collections)
users — id(uuid str), name, email(unique), password_hash, role(customer|restaurant|delivery|admin), phone, address, prefs{dietary,cuisines,calorie_cap}, vehicle, is_active
restaurants — id, owner_id, name, cuisines[], area, rating, prep_time_mins, delivery_fee, cost_for_two, is_open, is_pure_veg, closes_at, commission_pct, plan_price
menu_items — id, restaurant_id, name, price, category, diet(veg|nonveg|egg), calories/protein/carbs/fats, allergens[], ingredients[], spice, customisable, is_available, is_surplus/original_price/surplus_qty, prep_mins, orders_count, tags[]
orders — id, customer_id, restaurant_id, items[{item_id,name,price,qty,diet}], status(placed|accepted|preparing|ready|picked|delivered|cancelled|rejected), subtotal/packaging_fee/delivery_fee/platform_fee/gst/batching_discount/total, payment_method(upi|card|cod|wallet), payment_status, batching, group_id/group_code, scheduled_for, prep_mins/eta_mins, partner_id, pickup_pin, payout, placed_at→delivered_at timeline
group_orders — id, code(6-digit unique), host_id, restaurant_id, status(open|locked|ordered), members[{user_id,name,items[],total}]
subscriptions (user_id, restaurant_id, meal lunch|dinner, days[], price_per_meal, status), reviews (order_id unique), donations (NGO sharing), complaints
Pricing (server-side, one source of truth: routers/orders.compute_breakdown)
packaging ₹15 (waived ≥₹599) · delivery = restaurant fee (30% off if eco-batching) · platform fee ₹6 · GST 5% of (subtotal+packaging).

Key flows
Customer: Home (budget slider, AI recs, surplus rail, filters) → restaurant menu → cart (single-restaurant) → checkout (transparent ledger, batching toggle, payment, schedule, group) → tracking (5 stages, animated courier) → history/reorder/review/complaint; Subscriptions page.
Restaurant: /dashboard/restaurant — queue accept/reject/preparing/ready, menu CRUD + availability + surplus toggle, revenue/popularity analytics (recharts), NGO donate.
Delivery: /dashboard/delivery — batched ready orders by restaurant, claim batch, pickup PIN, deliver, earnings chart.
Admin: /dashboard/admin — overview KPIs, users (block/unblock), orders monitor, per-restaurant commission, complaints resolve, NGO audit, fraud radar (velocity / high-value COD / repeat cancellers).
Seeded state
6 restaurants (owner@smartbite.in owns all), ~52 menu items with allergens/macros/photos, ~28 orders over 7 days + 4 live orders in distinct stages (picked order → courier animates on tracking), reviews, 1 open + 1 resolved complaint, 3 NGO donations, 2 subscriptions, group room code 482913. Seed script: backend/seed.py (idempotent, skips if users exist).

Credentials
See memory/test_credentials.md — all demo accounts use password smartbite123
