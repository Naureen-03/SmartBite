import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, UtensilsCrossed } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-800 bg-stone-950 px-4 py-10 text-stone-400 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <UtensilsCrossed className="h-4.5 w-4.5" />
            </span>
            <span className="font-heading text-lg font-extrabold">
              Smart<span className="text-primary">Bite</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            The intelligent food ecosystem — affordable, personalised, transparent, sustainable.
          </p>
          <div className="mt-4 flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> FSSAI verified kitchens
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1.5">
              <Leaf className="h-3.5 w-3.5 text-green-500" /> Zero-waste mission
            </span>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-200">For Foodies</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Discover restaurants</Link></li>
            <li><Link to="/orders" className="hover:text-white">Track an order</Link></li>
            <li><Link to="/subscriptions" className="hover:text-white">Tiffin subscriptions</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-200">For Partners</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/register" className="hover:text-white">List your restaurant</Link></li>
            <li><Link to="/register" className="hover:text-white">Deliver with SmartBite</Link></li>
            <li><Link to="/dashboard/restaurant" className="hover:text-white">Partner dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-200">Impact</h4>
          <p className="text-sm leading-relaxed">
            Every eco-batched delivery saves ~0.8 kg CO₂. Every surplus meal rescued feeds an NGO
            partner instead of a landfill.
          </p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-7xl border-t border-stone-800 pt-6 text-xs">
        © {new Date().getFullYear()} SmartBite Foods Pvt. Ltd. · Bengaluru · Prices include all taxes shown at checkout
      </p>
    </footer>
  );
}
