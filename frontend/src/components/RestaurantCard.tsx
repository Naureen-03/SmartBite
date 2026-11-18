import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Bike, Clock, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { inr, minutesUntil } from "@/lib/format";
import type { Restaurant } from "@/lib/types";

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const minsToClose = minutesUntil(restaurant.closes_at);
  const closingSoon = minsToClose > 0 && minsToClose <= 45;

  return (
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      <Link
        to={`/restaurants/${restaurant.id}`}
        className="group block overflow-hidden rounded-3xl border border-stone-200/80 bg-card shadow-sm transition-shadow hover:shadow-lg dark:border-stone-800"
        data-testid="restaurant-card"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {restaurant.is_pure_veg && (
              <Badge className="border-0 bg-green-600 text-white" data-testid="restaurant-veg-badge">Pure Veg</Badge>
            )}
            {closingSoon && (
              <Badge className="border-0 bg-amber-500 text-white" data-testid="restaurant-closing-badge">
                Closing in {minsToClose}m
              </Badge>
            )}
          </div>
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-stone-900">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {restaurant.rating.toFixed(1)}
            <span className="font-normal text-stone-500">({restaurant.rating_count})</span>
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-heading text-base font-bold tracking-tight">{restaurant.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {restaurant.cuisines.join(" · ")}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1" data-testid="restaurant-eta">
              <Clock className="h-3.5 w-3.5" /> {restaurant.prep_time_mins + 12} min
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {restaurant.area}
            </span>
            <span className="ml-auto font-semibold text-foreground">{inr(restaurant.cost_for_two)} for two</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
            <Bike className="h-3.5 w-3.5" />
            {inr(restaurant.delivery_fee)} delivery · FREE with eco-batching
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
