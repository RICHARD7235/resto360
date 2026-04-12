"use client";

import { useEffect, useState } from "react";
import { Clock, Users, Receipt, X, CreditCard, ShoppingBag, Truck, Store, Flame, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function computeElapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderSummaryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  status: string;
  payment_id?: string | null;
  course_number?: number;
}

interface OrderSummaryProps {
  order: {
    id: string;
    table_number: string | null;
    status: string;
    total: number;
    notes: string | null;
    created_at: string;
    order_type?: string;
    paid_amount?: number;
    customer_name?: string | null;
    items: OrderSummaryItem[];
    courses?: { course_number: number; label: string; status: "hold" | "fired" | "ready" | "served" }[];
  };
  onViewDetail: () => void;
  onStatusChange?: (orderId: string, status: string) => void;
  onCancelItem?: (itemId: string, itemName: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onOpenPayment?: (orderId: string) => void;
  onFireNextCourse?: (orderId: string) => void;
  nextFireableCourse?: number | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  sent: { label: "Envoyee", variant: "destructive" },
  preparing: { label: "En prepa", variant: "default" },
  ready: { label: "Prete", variant: "secondary" },
  served: { label: "Servie", variant: "outline" },
  paid: { label: "Payee", variant: "outline" },
  cancelled: { label: "Annulee", variant: "destructive" },
};

const orderTypeConfig: Record<string, { label: string; icon: typeof Store }> = {
  dine_in: { label: "Sur place", icon: Store },
  takeaway: { label: "A emporter", icon: ShoppingBag },
  delivery: { label: "Livraison", icon: Truck },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const COURSE_LABELS: Record<number, string> = {
  0: "Immediat",
  1: "Entrees",
  2: "Plats",
  3: "Desserts",
};

export function OrderSummary({
  order,
  onViewDetail,
  onCancelItem,
  onCancelOrder,
  onOpenPayment,
  onFireNextCourse,
  nextFireableCourse,
}: OrderSummaryProps) {
  const [elapsed, setElapsed] = useState(() => computeElapsed(order.created_at));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(computeElapsed(order.created_at));
    }, 30_000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  const config = statusConfig[order.status] ?? { label: order.status, variant: "outline" as const };
  const orderType = order.order_type ?? "dine_in";
  const typeConfig = orderTypeConfig[orderType];
  const TypeIcon = typeConfig?.icon ?? Store;
  const paidAmount = order.paid_amount ?? 0;
  const paymentProgress = order.total > 0 ? Math.min(100, (paidAmount / order.total) * 100) : 0;
  const isFullyPaid = paidAmount >= order.total;

  const canPay =
    ["ready", "served"].includes(order.status) && !isFullyPaid;
  const canCancel = !["paid", "cancelled"].includes(order.status);

  const activeItems = order.items.filter((i) => i.status !== "cancelled");

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          {order.table_number ? `Table ${order.table_number}` : order.customer_name ?? "—"}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-1.5">
            {orderType !== "dine_in" && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <TypeIcon className="h-3 w-3" />
                {typeConfig?.label}
              </Badge>
            )}
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3" onClick={onViewDetail}>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {elapsed} min
          </span>
          <span className="flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {order.total.toFixed(2)} EUR
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {activeItems.length} article{activeItems.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Payment progress */}
        {paidAmount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Paye : {paidAmount.toFixed(2)} / {order.total.toFixed(2)} EUR
              </span>
              <span className="font-medium">
                {isFullyPaid ? "Solde" : `${paymentProgress.toFixed(0)}%`}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isFullyPaid ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2 text-xs">
          {(() => {
            const courses = order.courses ?? [];
            const hasCourses = courses.length > 1;

            if (!hasCourses) {
              // No coursing — flat list (backward compat)
              return (
                <ul className="space-y-0.5">
                  {order.items.slice(0, 6).map((item) => {
                    const isCancelled = item.status === "cancelled";
                    const isPaid = !!item.payment_id;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between gap-1",
                          isCancelled && "opacity-40 line-through"
                        )}
                      >
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="truncate">
                            {item.quantity}x {item.product_name}
                          </span>
                          {isPaid && !isCancelled && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                              Paye
                            </Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-muted-foreground">
                            {(item.quantity * item.unit_price).toFixed(2)} EUR
                          </span>
                          {onCancelItem && !isCancelled && canCancel && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 min-h-0 min-w-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancelItem(item.id, item.product_name);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {order.items.length > 6 && (
                    <li className="text-muted-foreground italic">
                      +{order.items.length - 6} autre{order.items.length - 6 > 1 ? "s" : ""}
                    </li>
                  )}
                </ul>
              );
            }

            // Course-grouped rendering
            return courses.map((course) => {
              const courseItems = order.items.filter(
                (i) => (i.course_number ?? 1) === course.course_number
              );
              if (courseItems.length === 0) return null;

              const statusIcon =
                course.status === "ready" ? "🟢" :
                course.status === "served" ? "✅" :
                course.status === "fired" ? "🟡" :
                "⏸️";

              return (
                <div
                  key={course.course_number}
                  className={cn(course.status === "hold" && "opacity-50")}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                    <span>{statusIcon}</span>
                    <span>{course.label}</span>
                  </div>
                  <ul className="space-y-0.5 pl-4">
                    {courseItems.map((item) => {
                      const isCancelled = item.status === "cancelled";
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between gap-1",
                            isCancelled && "opacity-40 line-through"
                          )}
                        >
                          <span className="truncate">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="text-muted-foreground">
                              {(item.quantity * item.unit_price).toFixed(2)} EUR
                            </span>
                            {onCancelItem && !isCancelled && canCancel && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 min-h-0 min-w-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelItem(item.id, item.product_name);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            });
          })()}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {onFireNextCourse && nextFireableCourse != null && (
            <Button
              className="min-h-11 flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
              onClick={(e) => {
                e.stopPropagation();
                onFireNextCourse(order.id);
              }}
            >
              <Flame className="h-4 w-4" />
              Envoyer {COURSE_LABELS[nextFireableCourse] ?? `Service ${nextFireableCourse}`}
            </Button>
          )}
          {canPay && onOpenPayment && (
            <Button
              className="min-h-11 flex-1 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPayment(order.id);
              }}
            >
              <CreditCard className="h-4 w-4" />
              Encaisser
            </Button>
          )}
          {canCancel && onCancelOrder && (
            <Button
              variant="destructive"
              className="min-h-11 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onCancelOrder(order.id);
              }}
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
