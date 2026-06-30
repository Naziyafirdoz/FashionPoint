/** Invoice numbers are derived from order numbers — no separate DB column. */
export function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber}`;
}
