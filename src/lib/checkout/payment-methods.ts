export type PaymentMethodId = "upi" | "card" | "netbanking" | "wallet" | "cod";

export type PaymentMethodOption = {
  id: PaymentMethodId;
  title: string;
  description: string;
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "upi",
    title: "UPI Payment",
    description: "Pay using any UPI app (Google Pay, PhonePe, Paytm, BHIM, etc.)"
  },
  {
    id: "card",
    title: "Credit / Debit Card",
    description: "Visa, Mastercard, RuPay & more"
  },
  {
    id: "netbanking",
    title: "Net Banking",
    description: "Pay through bank account"
  },
  {
    id: "wallet",
    title: "Wallet",
    description: "Paytm / Amazon Pay / Wallet"
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    description: "Pay when your order arrives"
  }
];

/** Payment options shown at checkout (prepaid only). */
export const CHECKOUT_PAYMENT_METHODS: PaymentMethodOption[] = PAYMENT_METHODS.filter(
  (m) => m.id === "upi" || m.id === "card" || m.id === "netbanking"
);

export function paymentMethodLabel(id: string | undefined) {
  const match = PAYMENT_METHODS.find((m) => m.id === id);
  return match?.title ?? (id === "cod" ? "Cash on Delivery" : "Online Payment");
}
