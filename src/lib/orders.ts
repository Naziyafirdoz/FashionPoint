export { computeShippingAmount } from "@/lib/shipping/rates";

export function generateOrderNumber() {
  return `FP-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
