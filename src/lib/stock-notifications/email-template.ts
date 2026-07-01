import { SITE_URL, STORE_NAME } from "@/lib/site-config";

export function buildBackInStockEmail(params: {
  customerName: string;
  productName: string;
  productSlug: string;
}): { subject: string; html: string } {
  const productUrl = `${SITE_URL}/product/${encodeURIComponent(params.productSlug)}`;
  const subject = `🎉 Your requested ${params.productName} is back in stock!`;

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Georgia, 'Times New Roman', serif; color: #2a2a2a; line-height: 1.6; margin: 0; padding: 24px;">
    <p>Hi ${escapeHtml(params.customerName)},</p>
    <p><strong>Great news!</strong></p>
    <p>The product you requested is now back in stock.</p>
    <p>Click below to view and order before it sells out again.</p>
    <p style="margin: 28px 0;">
      <a href="${productUrl}" style="display: inline-block; background: #7B0D2B; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: 600;">
        View Product
      </a>
    </p>
    <p>Regards,<br>${escapeHtml(STORE_NAME)}</p>
  </body>
</html>`;

  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
