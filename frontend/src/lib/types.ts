// Hand-written mirrors of the Pydantic models in backend/models/* — keep in sync in the same edit.

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "restaurant" | "delivery" | "admin";
  phone: string;
  address: string;
  prefs: { dietary: string[]; cuisines: string[]; calorie_cap: number | null };
  vehicle: string;
  is_active: boolean;
  created_at: string | null;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  cuisines: string[];
  description: string;
  image_url: string;
  address: string;
  area: string;
  rating: number;
  rating_count: number;
  prep_time_mins: number;
  delivery_fee: number;
  cost_for_two: number;
  is_open: boolean;
  is_pure_veg: boolean;
  closes_at: string;
  commission_pct: number;
  plan_price: number;
  created_at: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  diet: "veg" | "nonveg" | "egg";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  allergens: string[];
  ingredients: string[];
  spice: string;
  customisable: boolean;
  is_available: boolean;
  is_surplus: boolean;
  original_price: number | null;
  surplus_qty: number;
  prep_mins: number;
  orders_count: number;
  tags: string[];
}

export interface MetaInfo {
  weather: string;
  time_of_day: string;
  city: string;
  greeting: string;
}

export interface RecItem {
  item_id: string;
  name: string;
  image_url: string;
  price: number;
  original_price: number | null;
  diet: string;
  calories: number;
  protein: number;
  is_surplus: boolean;
  restaurant_id: string;
  restaurant_name: string;
  area: string;
  score: number;
  reasons: string[];
}

export interface RecsResponse {
  weather: string;
  time_of_day: string;
  items: RecItem[];
}

export interface BudgetLine {
  item_id: string;
  name: string;
  image_url: string;
  diet: string;
  price: number;
  restaurant_id: string;
  restaurant_name: string;
  area: string;
  calories: number;
  total_price: number;
  breakdown: {
    item: number;
    packaging: number;
    delivery: number;
    platform_fee: number;
    gst: number;
    batching: boolean;
  };
}

export interface SurplusDeal {
  item_id: string;
  name: string;
  image_url: string;
  price: number;
  original_price: number;
  surplus_qty: number;
  restaurant_id: string;
  restaurant_name: string;
  area: string;
  closes_at: string;
  diet: string;
}

export interface OrderItem {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  diet: string;
  image_url: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  restaurant_id: string;
  restaurant_name: string;
  items: OrderItem[];
  address: string;
  status: "placed" | "accepted" | "preparing" | "ready" | "picked" | "delivered" | "cancelled" | "rejected";
  subtotal: number;
  packaging_fee: number;
  delivery_fee: number;
  platform_fee: number;
  gst: number;
  batching_discount: number;
  total: number;
  payment_method: "upi" | "card" | "cod" | "wallet";
  payment_status: string;
  batching: boolean;
  group_id: string | null;
  group_code: string | null;
  scheduled_for: string | null;
  prep_mins: number;
  eta_mins: number;
  partner_id: string | null;
  partner_name: string | null;
  pickup_pin: string;
  payout: number;
  placed_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  picked_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface TrackInfo {
  order_id: string;
  status: string;
  stage: number;
  stage_label: string;
  progress_pct: number;
  eta_mins: number;
  minutes_left: number;
  temperature_c: number;
  distance_km: number;
  route_points: [number, number][];
  bike_at: number[];
  partner_name: string | null;
  pickup_pin: string;
  prep_mins: number;
}

export interface GroupMember {
  user_id: string;
  name: string;
  items: OrderItem[];
  total: number;
}

export interface GroupOrder {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  restaurant_id: string;
  restaurant_name: string;
  status: "open" | "locked" | "ordered";
  members: GroupMember[];
  order_id: string | null;
  created_at: string;
}

export interface GroupCheckoutResp {
  order: Order;
  split: { name: string; total: number }[];
  grand_total: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  meal: "lunch" | "dinner";
  days: string[];
  price_per_meal: number;
  status: "active" | "paused" | "cancelled";
  started_at: string;
}

export interface Donation {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  ngo_name: string;
  meals: number;
  status: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  subject: string;
  message: string;
  status: string;
  resolution: string;
  created_at: string;
}

export interface DashboardResp {
  restaurant: Restaurant;
  active_orders: Order[];
  recent_orders: Order[];
  stats: {
    today_orders: number;
    today_revenue: number;
    today_commission: number;
    pending_count: number;
    menu_count: number;
    low_stock: string[];
  };
  menu: MenuItem[];
}

export interface AnalyticsResp {
  daily: { day: string; revenue: number; orders: number }[];
  popular: { name: string; orders: number }[];
  reviews: { name: string; rating: number; comment: string }[];
}

export interface DeliveryBatch {
  restaurant_id: string;
  restaurant_name: string;
  area: string;
  image_url: string;
  orders: Order[];
  total_payout: number;
}

export interface DeliveryMe {
  name: string;
  vehicle: string;
  total_deliveries: number;
  today_earnings: number;
  week_earnings: number;
  weekly: Record<string, number>;
  history: Order[];
  rating: number;
}

export interface AdminOverview {
  customers: number;
  restaurants: number;
  delivery_partners: number;
  admins: number;
  orders_this_week: number;
  gmv_this_week: number;
  commissions_this_week: number;
  orders_by_status: Record<string, number>;
  open_complaints: number;
  meals_saved: number;
  active_subscriptions: number;
  daily_gmv: { day: string; gmv: number }[];
  pending_donations: number;
}

export interface FraudFlag {
  kind: string;
  severity: string;
  customer_id: string;
  customer_name: string;
  order_id: string | null;
  detail: string;
}
