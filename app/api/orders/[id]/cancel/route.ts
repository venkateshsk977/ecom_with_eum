import { NextResponse } from "next/server";
import { cancelOrder } from "@/modules/orders/order.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const order = await cancelOrder(id);

  return NextResponse.json({
    success: true,
    data: order,
  });
}