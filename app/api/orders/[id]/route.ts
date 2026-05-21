import { NextResponse,NextRequest } from "next/server";
import { getOrderByIdSecure } from "@/modules/orders/order.service";
import { getUser } from "@/lib/getUser";
import { getErrorMessage } from "@/lib/response";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUser(request); // 🔐
    const { id } = await context.params;

    const order = await getOrderByIdSecure(id, user);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // 🔒 Ownership check
    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to fetch order");

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
