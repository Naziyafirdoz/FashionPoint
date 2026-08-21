import { adminDashboardEmailUrl } from "@/lib/server/notifications/email-app-url";
import {
  nonZeroPendingActionKeys,
  type DailyPendingActionCounts,
  type DailyPendingActionKey
} from "@/lib/server/notifications/pending-digest-counts";
import { STORE_TIMEZONE } from "@/lib/site-config";

const MAROON = "#7B0D2B";
const CARD_BG = "#FAF8F6";
const BORDER = "#E8E0DA";
const TEXT = "#1A1A1A";
const MUTED = "#5C5C5C";

type DigestSection = {
  key: DailyPendingActionKey;
  emoji: string;
  title: string;
  line: (count: number) => string;
};

const DIGEST_SECTIONS: DigestSection[] = [
  {
    key: "newOrders",
    emoji: "🛒",
    title: "New Orders",
    line: (count) =>
      count === 1 ? "1 order waiting for approval" : `${count} orders waiting for approval`
  },
  {
    key: "lowStock",
    emoji: "📦",
    title: "Low Stock",
    line: (count) =>
      count === 1 ? "1 product is low in stock" : `${count} products are low in stock`
  },
  {
    key: "outOfStock",
    emoji: "🚫",
    title: "Out of Stock",
    line: (count) =>
      count === 1
        ? "1 product is currently out of stock"
        : `${count} products are currently out of stock`
  },
  {
    key: "cancellationRequests",
    emoji: "❌",
    title: "Cancellation Requests",
    line: (count) =>
      count === 1
        ? "1 cancellation request is pending"
        : `${count} cancellation requests are pending`
  },
  {
    key: "refundPending",
    emoji: "💰",
    title: "Refunds",
    line: (count) =>
      count === 1
        ? "1 refund request requires attention"
        : `${count} refund requests require attention`
  }
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function visibleDigestSections(counts: DailyPendingActionCounts): DigestSection[] {
  const visible = new Set(nonZeroPendingActionKeys(counts));
  return DIGEST_SECTIONS.filter((section) => visible.has(section.key));
}

function digestEmailShell(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#F3EFEB;font-family:system-ui,-apple-system,sans-serif;color:${TEXT};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 12px;"><table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:${MAROON};padding:18px 16px;text-align:center;color:#fff;font-size:18px;font-weight:700;">Fashion Point</td></tr><tr><td style="padding:24px 20px;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>${body}</td></tr><tr><td style="padding:20px 16px;text-align:center;border-top:1px solid ${BORDER};"><p style="margin:0;font-size:12px;color:${MUTED};">Fashion Point • Vijayawada</p></td></tr></table></td></tr></table></body></html>`;
}

export function buildDailyPendingDigestEmail(
  counts: DailyPendingActionCounts,
  dateLabel: string,
  dashboardUrl = adminDashboardEmailUrl()
): { subject: string; html: string } {
  const sections = visibleDigestSections(counts);
  const total = counts.total;
  const attention =
    total === 1 ? "1 action requires attention" : `${total} actions require attention`;

  const sectionHtml = sections
    .map((section) => {
      const count = counts[section.key];
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${MAROON};">${section.emoji} ${escapeHtml(section.title)}</p>
          <p style="margin:0;font-size:15px;line-height:1.5;color:${TEXT};">${escapeHtml(section.line(count))}</p>
        </td></tr>
      </table>`;
    })
    .join("");

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${MAROON};">Fashion Point — Pending Actions for Today</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${MUTED};">${escapeHtml(dateLabel)} · ${escapeHtml(STORE_TIMEZONE)}</p>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:${TEXT};">⚠️ <strong>${escapeHtml(attention)}</strong></p>
    ${sectionHtml}
    <p style="margin:8px 0 20px;font-size:15px;line-height:1.6;color:${TEXT};">Please review these items in the Fashion Point Admin Panel.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${escapeHtml(dashboardUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;min-width:220px;height:54px;line-height:54px;background-color:${MAROON};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;text-align:center;">Open Admin Panel</a>
        </td>
      </tr>
    </table>`;

  return {
    subject: `Fashion Point — Pending Actions | ${dateLabel}`,
    html: digestEmailShell(
      `Fashion Point — Pending Actions | ${dateLabel}`,
      attention,
      body
    )
  };
}
