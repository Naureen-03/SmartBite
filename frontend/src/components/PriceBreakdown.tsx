// Transparent price ledger — every rupee of the order shown before checkout.
import { Info } from "lucide-react";
import { inr2 } from "@/lib/format";

interface Props {
  subtotal: number;
  packagingFee: number;
  deliveryFee: number;
  platformFee: number;
  gst: number;
  batchingDiscount: number;
  total: number;
  batching: boolean;
}

function Row({
  label, hint, value, testId, negate = false,
}: { label: string; hint?: string; value: number; testId?: string; negate?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-sm" data-testid={testId}>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {label}
        {hint && (
          <span title={hint}>
            <Info className="h-3 w-3 opacity-60" />
          </span>
        )}
      </span>
      <span className={`font-medium tabular-nums ${negate ? "text-green-700 dark:text-green-400" : ""}`}>
        {negate ? `− ${inr2(value)}` : inr2(value)}
      </span>
    </div>
  );
}

export default function PriceBreakdown(props: Props) {
  const { subtotal, packagingFee, deliveryFee, platformFee, gst, batchingDiscount, total, batching } = props;
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-card p-4 dark:border-stone-800" data-testid="price-breakdown">
      <h4 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-400">
        Transparent pricing
      </h4>
      <div className="mt-2 divide-y divide-dashed divide-border">
        <Row label="Item subtotal" value={subtotal} testId="price-breakdown-subtotal" />
        <Row
          label="Packaging (tamper-proof)"
          hint="Waived on orders of ₹599 and above"
          value={packagingFee}
          testId="price-breakdown-packaging"
        />
        <Row
          label={batching ? "Delivery (eco-batched)" : "Delivery fee"}
          hint={batching ? "30% off — your order shares a route with a nearby drop" : "Distance-based partner payout"}
          value={deliveryFee}
          testId="price-breakdown-delivery"
        />
        <Row label="Platform fee" hint="Flat ₹6 — keeps SmartBite ad-free" value={platformFee} testId="price-breakdown-platform" />
        <Row label="GST (5%)" hint="Government tax on food + packaging" value={gst} testId="price-breakdown-gst" />
        {batchingDiscount > 0 && (
          <Row label="Eco-batching discount" value={batchingDiscount} negate testId="price-breakdown-batch-discount" />
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t-2 border-foreground/80 pt-3" data-testid="price-breakdown-total">
        <span className="font-heading font-bold">To pay</span>
        <span className="font-heading text-xl font-extrabold tabular-nums">{inr2(total)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        The price above is final — no surprises at the door. Packaging is complimentary over ₹599.
      </p>
    </div>
  );
}
