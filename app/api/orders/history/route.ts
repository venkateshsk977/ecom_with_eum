import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/modules/orders/order.service";
import { OrderStatus } from "@prisma/client";
import { getUser } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  try {
    const user = getUser(req); // 🔐 source of truth

    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const limit = Number(searchParams.get("limit")) || 10;

    const rawStatus = searchParams.getAll("status");

    const status = rawStatus.length
      ? rawStatus.filter((s): s is OrderStatus =>
          Object.values(OrderStatus).includes(s as OrderStatus)
        )
      : undefined;

    // 🔒 enforce ownership
    const userId =
      user.role === "ADMIN"
        ? searchParams.get("userId") || undefined // admin can filter
        : user.id; // user locked to own data

    const orders = await getOrders({
      userId,
      status,
      cursor: cursor || undefined,
      limit,
    });

    return NextResponse.json({
      data: orders,
      nextCursor: orders.length
        ? orders[orders.length - 1].id
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch orders" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}