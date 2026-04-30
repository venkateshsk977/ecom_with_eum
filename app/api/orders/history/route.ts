import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/modules/orders/order.service";
import { OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId");
  const cursor = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit")) || 10;

  const rawStatus = searchParams.getAll("status");

  const status = rawStatus.length
    ? rawStatus.filter((s): s is OrderStatus =>
        Object.values(OrderStatus).includes(s as OrderStatus)
      )
    : undefined;

  const orders = await getOrders({
    userId: userId || undefined,
    status,
    cursor: cursor || undefined,
    limit,
  });

  return NextResponse.json({
    data: orders,
    nextCursor: orders.length ? orders[orders.length - 1].id : null,
  });
}