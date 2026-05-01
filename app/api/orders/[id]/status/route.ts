import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/modules/orders/order.service";
import { OrderStatus } from "@prisma/client";
import { getUser } from "@/lib/getUser";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const user = getUser(req);

    // 🔒 Only ADMIN allowed
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updated = await updateOrderStatus(id, status, user);

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }
}