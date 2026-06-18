/**
 * Returns, exchanges, and refund workflows are intentionally disabled per client requirements.
 * Do not re-enable without explicit business approval.
 *
 * Legacy `return_requests` and refund-related order columns remain in the database
 * but must not drive UI or new automated workflows.
 */
export const RETURNS_EXCHANGES_REFUNDS_DISABLED = true;

/** Customer-initiated order cancellation (pre-shipment) is enabled separately from returns. */
export const CUSTOMER_ORDER_CANCELLATION_ENABLED = true;

export function isCancellationRefundWorkflowEnabled(): boolean {
  return CUSTOMER_ORDER_CANCELLATION_ENABLED;
}

export const FINAL_SALE_POLICY_TITLE = "Returns, Exchanges & Refunds";

export const FINAL_SALE_POLICY_SUMMARY =
  "All sales are final. We do not accept returns, exchanges, or refund requests once an order has been placed or delivered.";

export const FINAL_SALE_CHECKOUT_NOTICE =
  "This order is not eligible for returns, exchanges, or refunds. Please verify your size, color, shipping address, and product selection before placing the order.";

export const FINAL_SALE_SUPPORT_NOTE =
  "If you receive a damaged, defective, or incorrect product, the issue will be reviewed manually by customer support. No automated refund or exchange system applies.";
