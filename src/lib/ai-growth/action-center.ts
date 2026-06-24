export type ActionCenterPriority = "high" | "medium" | "low";

export type ActionCenterRecommendation = {
  id: string;
  priority: ActionCenterPriority;
  problem: string;
  recommendation: string;
  reason: string;
  timestamp: string;
};

export type ActionCenterSection = {
  id: "high-priority" | "opportunities" | "recent-improvements";
  title: string;
  subtitle: string;
  items: ActionCenterRecommendation[];
};

export const ACTION_CENTER_PRIORITY_LABELS: Record<ActionCenterPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

const now = Date.now();
const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

export const ACTION_CENTER_SECTIONS: ActionCenterSection[] = [
  {
    id: "high-priority",
    title: "High Priority",
    subtitle: "Issues that need attention soon",
    items: [
      {
        id: "low-stock",
        priority: "high",
        problem: "3 designer blouses are below restock threshold (≤ 2 units).",
        recommendation: "Reorder Silk Party Blouse, Embroidered Daily Wear, and Festive Red Blouse within 48 hours.",
        reason: "Low inventory increases lost sales risk during peak evening browsing hours.",
        timestamp: hoursAgo(2)
      },
      {
        id: "revenue-drop",
        priority: "high",
        problem: "Revenue is down 14% compared to the previous 7-day period.",
        recommendation: "Run a limited-time bundle offer on top daily-wear blouses and promote via WhatsApp broadcast.",
        reason: "A short promotional push can recover weekly revenue without deep discounting.",
        timestamp: hoursAgo(5)
      },
      {
        id: "rating-drop",
        priority: "medium",
        problem: "Average product rating slipped from 4.6 to 4.2 over the last 14 days.",
        recommendation: "Review recent 1–2 star feedback and follow up with affected customers.",
        reason: "Early response to negative reviews protects conversion on high-traffic product pages.",
        timestamp: hoursAgo(8)
      },
      {
        id: "high-demand",
        priority: "high",
        problem: "Cotton Office Blouse views are up 38% but only 4 units remain in stock.",
        recommendation: "Prioritize restock and pin the product to Featured Products until inventory stabilizes.",
        reason: "Demand spike with thin stock typically leads to abandoned carts and missed revenue.",
        timestamp: hoursAgo(1)
      }
    ]
  },
  {
    id: "opportunities",
    title: "Opportunities",
    subtitle: "Growth levers worth acting on",
    items: [
      {
        id: "rising-sales",
        priority: "medium",
        problem: "Linen Summer Blouse sales grew 26% week-over-week with stable margins.",
        recommendation: "Increase ad spend on this SKU and cross-sell matching daily-wear pieces at checkout.",
        reason: "Momentum products convert well when surfaced earlier in category listings.",
        timestamp: hoursAgo(12)
      },
      {
        id: "feature-candidate",
        priority: "low",
        problem: "Pearl Work Designer Blouse has high add-to-cart rate but low homepage visibility.",
        recommendation: "Add to Featured Products and highlight in the designer-wear collection banner.",
        reason: "Strong intent signals with low exposure are ideal candidates for featuring.",
        timestamp: daysAgo(1)
      }
    ]
  },
  {
    id: "recent-improvements",
    title: "Recent Improvements",
    subtitle: "Positive shifts from the latest period",
    items: [
      {
        id: "revenue-increase",
        priority: "low",
        problem: "Monthly revenue crossed ₹4.2L, up 9% from the prior month.",
        recommendation: "Document the blouse bundles and WhatsApp campaigns that drove the uplift for reuse.",
        reason: "Capturing what worked helps repeat successful campaigns during the next festival season.",
        timestamp: daysAgo(2)
      },
      {
        id: "best-seller",
        priority: "low",
        problem: "Classic Cotton Blouse became the best-selling SKU with 47 orders this month.",
        recommendation: "Ensure backup sizes are stocked and create a “Shop the bestseller” homepage strip.",
        reason: "Bestsellers attract new customers and improve trust for first-time buyers.",
        timestamp: daysAgo(3)
      }
    ]
  }
];

export function formatActionCenterTimestamp(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
