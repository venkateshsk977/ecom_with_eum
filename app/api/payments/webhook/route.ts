import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text(); // ⚠️ must be text
    const signature = request.headers.get("x-razorpay-signature")!;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    // We care about payment events
    const payment = event.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ success: true });
    }

    const razorpayOrderId = payment.order_id;
    const paymentId = payment.id;
    const paymentStatus = payment.status;

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId },
    });

    if (!order) {
      return NextResponse.json({ success: true });
    }

    // 🧠 Idempotency guard (important)
    if (order.status === "PAID") {
      return NextResponse.json({ success: true });
    }

    if (paymentStatus === "captured") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentId,
        },
      });
    }

    if (paymentStatus === "failed") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
         status: OrderStatus.FAILED,
          paymentId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}