import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, Minus, Plus, WheatOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DietMark from "./DietMark";
import { useCart } from "@/lib/cart";
import { inr } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

export default function DishCard({ item, restaurantName }: { item: MenuItem; restaurantName: string }) {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const qty = cart.qtyOf(item.id);
  const discount = item.is_surplus && item.original_price ? Math.round((1 - item.price / item.original_price) * 100) : 0;

  const handleAdd = () => {
    const replaced = cart.add(item, restaurantName);
    if (replaced) {
      // Cart held another restaurant — server checkout is single-restaurant.
      import("sonner").then(({ toast }) => toast.info(`Cart switched to ${restaurantName}`));
    } else {
      import("sonner").then(({ toast }) => toast.success(`${item.name} added to cart`));
    }
  };

  return (
    <div
      className="flex gap-4 rounded-2xl border border-stone-200/80 bg-card p-4 shadow-xs dark:border-stone-800"
      data-testid="dish-card"
    >
      <div className="relative hidden h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:block">
        <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        {item.is_surplus && (
          <span className="absolute left-1 top-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white" data-testid="dish-surplus-badge">
            {discount}% OFF · {item.surplus_qty} left
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <DietMark diet={item.diet} />
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-heading text-sm font-bold tracking-tight" data-testid="dish-name">{item.name}</h4>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-heading text-sm font-bold text-foreground" data-testid="dish-price">
            {inr(item.price)}
            {item.is_surplus && item.original_price && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">{inr(item.original_price)}</span>
            )}
          </span>
          <span>{item.calories} kcal</span>
          <span>{item.protein}g protein</span>
          {item.spice === "fiery" && (
            <span className="inline-flex items-center gap-0.5 text-red-600"><Flame className="h-3 w-3" /> Fiery</span>
          )}
          {item.allergens.length > 0 && (
            <button
              className="inline-flex items-center gap-1 font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400"
              onClick={() => setOpen(!open)}
              data-testid="dish-allergen-toggle"
            >
              <WheatOff className="h-3 w-3" /> Allergens
            </button>
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              data-testid="dish-allergen-panel"
            >
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs dark:bg-amber-950/30">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Contains: {item.allergens.join(", ")}</p>
                <p className="mt-1 text-muted-foreground">Ingredients: {item.ingredients.join(", ")}</p>
                <p className="mt-1 text-muted-foreground">
                  {item.calories} kcal · {item.protein}g protein · {item.carbs}g carbs · {item.fats}g fats
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-end justify-between">
        {item.is_surplus && <Badge className="mb-2 border-0 bg-amber-100 text-amber-900">Saver deal</Badge>}
        {!item.is_available ? (
          <Button disabled variant="secondary" size="sm" data-testid="dish-sold-out">Sold out</Button>
        ) : qty === 0 ? (
          <Button size="sm" onClick={handleAdd} data-testid="dish-add-to-cart-button" className="font-bold">
            ADD <Plus className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          <motion.div
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-2 rounded-lg bg-primary px-1.5 py-1 text-white"
            data-testid="dish-stepper"
          >
            <button aria-label="Decrease" data-testid="dish-stepper-decrement" onClick={() => cart.setQty(item.id, qty - 1)}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-4 text-center text-sm font-bold" data-testid="dish-stepper-qty">{qty}</span>
            <button aria-label="Increase" data-testid="dish-stepper-increment" onClick={() => handleAdd()}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
