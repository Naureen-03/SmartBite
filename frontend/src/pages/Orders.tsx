import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareWarning, RotateCcw, Star } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type { MenuItem, Order, OrderItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime, inr2, PAYMENT_LABELS, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTIVE = new Set(["placed", "accepted", "preparing", "ready", "picked"]);

function orderItemToMenuItem(oi: OrderItem, restaurantId: string): MenuItem {
  return {
    id: oi.item_id, restaurant_id: restaurantId, name: oi.name, description: "",
    price: oi.price, image_url: oi.image_url, category: "", diet: oi.diet as MenuItem["diet"],
    calories: 0, protein: 0, carbs: 0, fats: 0, allergens: [], ingredients: [],
    spice: "medium", customisable: false, is_available: true, is_surplus: false,
    original_price: null, surplus_qty: 0, prep_mins: 15, orders_count: 0, tags: [],
  };
}

export default function Orders() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [complaintOrder, setComplaintOrder] = useState<Order | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["orders", me?.id],
    queryFn: () => apiGet<Order[]>("/orders"),
    enabled: me?.role === "customer",
    refetchInterval: 8000,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiPost<Order>(`/orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.info("Order cancelled — prepaid amounts auto-refund in 3–5 days");
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Could not cancel"),
  });

  const review = useMutation({
    mutationFn: (o: Order) => apiPost(`/orders/${o.id}/review`, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setReviewOrder(null);
      setComment("");
      toast.success("Thanks for the review!");
    },
    onError: (e) => toast.error((e as { body?: { detail?: string } }).body?.detail ?? "Could not review"),
  });

  const complaint = useMutation({
    mutationFn: (o: Order) => apiPost(`/orders/${o.id}/complaint`, { subject, message }),
    onSuccess: () => {
      setComplaintOrder(null);
      setSubject("");
      setMessage("");
      toast.info("Complaint filed — our support team will reach out");
    },
  });

  const reorder = (o: Order) => {
    navigate("/checkout", { state: { reorder: o.id } });
    toast("Use the track page's one-click reorder instead", { description: "Opening checkout…" });
  };

  if (me && me.role !== "customer") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-heading text-2xl font-extrabold">Order history is for foodies</h1>
        <p className="mt-2 text-sm text-muted-foreground">You're signed in as a partner account — your workspace lives on its dashboard.</p>
        <Button className="mt-6 font-bold" render={<Link to={me.role === "restaurant" ? "/dashboard/restaurant" : me.role === "delivery" ? "/dashboard/delivery" : "/dashboard/admin"} />}>
          Go to my dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Your orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track live orders, reorder favourites, review kitchens.</p>

      <div className="mt-6 space-y-4" data-testid="orders-list">
        {(orders ?? []).map((o) => {
          const meta = STATUS_META[o.status] ?? STATUS_META.placed;
          const canReview = o.status === "delivered";
          return (
            <div key={o.id} className="rounded-3xl border border-stone-200/80 bg-card p-5 dark:border-stone-800" data-testid="order-card">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-bold" data-testid="order-card-restaurant">{o.restaurant_name}</h3>
                <Badge className={cn("border-0", meta.className)} data-testid="order-card-status">{meta.label}</Badge>
                {o.batching && <Badge variant="outline" className="text-green-700 dark:text-green-400">Eco-batched</Badge>}
                {o.group_code && <Badge variant="outline">Group {o.group_code}</Badge>}
                {o.scheduled_for && <Badge variant="outline" className="text-sky-700 dark:text-sky-400">Scheduled {o.scheduled_for}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{fmtDateTime(o.placed_at)}</span>
              </div>
              <p className="mt-2 truncate text-sm text-muted-foreground">
                {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-heading text-lg font-extrabold" data-testid="order-card-total">{inr2(o.total)}</span>
                <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[o.payment_method]}</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {ACTIVE.has(o.status) && (
                    <Button size="sm" render={<Link to={`/orders/${o.id}`} />} data-testid="order-track-button">Track live</Button>
                  )}
                  {o.status === "delivered" && (
                    <Button size="sm" variant="ghost" render={<Link to={`/orders/${o.id}`} />} data-testid="order-view-button">Details</Button>
                  )}
                  {o.status === "placed" && (
                    <Button size="sm" variant="outline" onClick={() => cancel.mutate(o.id)} data-testid="order-cancel-button">Cancel</Button>
                  )}
                  <Button
                    size="sm" variant="outline"
                    onClick={() => reorder(o)}
                    data-testid="order-reorder-button"
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reorder
                  </Button>
                  {canReview && (
                    <Button size="sm" variant="secondary" onClick={() => setReviewOrder(o)} data-testid="order-review-button">
                      <Star className="mr-1 h-3.5 w-3.5" /> Review
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setComplaintOrder(o)} data-testid="order-complaint-button">
                    <MessageSquareWarning className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {orders && orders.length === 0 && (
          <div className="rounded-3xl border border-dashed p-16 text-center">
            <p className="text-muted-foreground">No orders yet — your first rescue deal awaits.</p>
            <Button className="mt-4 font-bold" render={<Link to="/" />} data-testid="orders-empty-browse">Browse kitchens</Button>
          </div>
        )}
      </div>

      {/* Review dialog */}
      <Dialog open={!!reviewOrder} onOpenChange={(open) => !open && setReviewOrder(null)}>
        <DialogContent data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle>Review {reviewOrder?.restaurant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-1.5" data-testid="review-rating-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                  <Star className={cn("h-7 w-7", n <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300")} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like? (optional)" data-testid="review-comment-input" />
          </div>
          <DialogFooter>
            <Button onClick={() => reviewOrder && review.mutate(reviewOrder)} disabled={review.isPending} className="font-bold" data-testid="review-submit-button">
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complaint dialog */}
      <Dialog open={!!complaintOrder} onOpenChange={(open) => !open && setComplaintOrder(null)}>
        <DialogContent data-testid="complaint-dialog">
          <DialogHeader>
            <DialogTitle>Report an issue · {complaintOrder?.restaurant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-subject">Subject</Label>
              <Input id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Missing items / late delivery…" data-testid="complaint-subject-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-message">What went wrong?</Label>
              <Textarea id="c-message" value={message} onChange={(e) => setMessage(e.target.value)} data-testid="complaint-message-input" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => complaintOrder && complaint.mutate(complaintOrder)} className="font-bold" data-testid="complaint-submit-button">File complaint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
