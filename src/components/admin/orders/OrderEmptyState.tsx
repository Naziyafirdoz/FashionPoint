"use client";

type OrderEmptyStateProps = {
  filter: string;
  onNavigate?: (tab: string) => void;
};

type EmptyStateConfig = {
  icon: string;
  title: string;
  description: string;
  cta?: { label: string; tab: string };
};

const EMPTY_STATE_CONFIG: Record<string, EmptyStateConfig> = {
  all: {
    icon: "📦",
    title: "No orders yet",
    description: "Orders will appear here after customers complete checkout."
  },
  new_orders: {
    icon: "🆕",
    title: "No new orders.",
    description: "Orders awaiting admin approval will appear here."
  },
  pending: {
    icon: "⏳",
    title: "No pending orders",
    description: "There are no orders awaiting processing right now."
  },
  processing: {
    icon: "🔧",
    title: "No new orders.",
    description: "Orders awaiting admin approval will appear here."
  },
  confirmed: {
    icon: "✅",
    title: "No confirmed orders.",
    description: "Approved orders awaiting Ready for Shipping will appear here."
  },
  ready_to_ship: {
    icon: "📋",
    title: "No ready-to-ship orders.",
    description: "Orders appear here after they are marked Ready for Shipping.",
    cta: { label: "View Confirmed Orders", tab: "confirmed" }
  },
  shipped: {
    icon: "🚚",
    title: "No orders handed to courier.",
    description: "Orders appear here after Mark Shipped."
  },
  out_for_delivery: {
    icon: "🚚",
    title: "No orders currently out for delivery.",
    description: "Orders appear here after shipping."
  },
  delivered: {
    icon: "✅",
    title: "No delivered orders found",
    description: "Completed deliveries will be listed here."
  },
  cancelled: {
    icon: "❌",
    title: "No cancelled orders found",
    description: "Cancelled orders will appear in this view."
  },
  cancelled_awaiting_refund: {
    icon: "⏳",
    title: "No cancellations awaiting refund",
    description: "Prepaid orders cancelled before shipment will appear here until refunded."
  },
  cancelled_refunded: {
    icon: "✔️",
    title: "No refunded cancellations found",
    description: "Cancelled orders with completed refunds will appear here."
  },
  refund_required: {
    icon: "⏳",
    title: "No cancellations awaiting refund",
    description: "Prepaid orders cancelled before shipment will appear here until refunded."
  },
  returns: {
    icon: "↩️",
    title: "No return requests found",
    description: "Customer return requests will appear here."
  }
};

export function OrderEmptyState({ filter, onNavigate }: OrderEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[filter] ?? EMPTY_STATE_CONFIG.all;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="text-4xl" aria-hidden>
        {config.icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{config.title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{config.description}</p>
      {config.cta && onNavigate ? (
        <button
          type="button"
          onClick={() => onNavigate(config.cta!.tab)}
          className="mt-4 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          {config.cta.label}
        </button>
      ) : null}
    </div>
  );
}
