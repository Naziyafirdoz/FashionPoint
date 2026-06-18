import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
  const { amount } = await req.json();
  const razorpay = getRazorpay();

  if (!razorpay) {
    return NextResponse.json({
      orderId: null,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      demo: true
    });
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount),
    currency: "INR",
    receipt: `fp_${Date.now()}`
  });

  return NextResponse.json({
    orderId: order.id,
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: order.amount
  });
}
