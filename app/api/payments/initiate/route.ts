import { NextResponse } from "next/server";
import { createPaymentOrder } from "@/modules/payments/payment.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { amount } = body;

    const payment = await createPaymentOrder(amount);

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Payment Init Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to initiate payment",
      },
      { status: 500 }
    );
  }
}