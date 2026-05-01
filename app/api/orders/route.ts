import { NextResponse,NextRequest } from "next/server";
import {
  createOrderFromCart,
  getOrdersByUserId,
} from "@/modules/orders/order.service";
import { getUser } from "@/lib/getUser";

export async function POST(request: NextRequest) {
  try {
    const user = getUser(request); // 🔐

    const order = await createOrderFromCart(user.id);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create order",
      },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUser(request); // 🔐

    const { searchParams } = new URL(request.url);

    // ADMIN can optionally query others
    const userId =
      user.role === "ADMIN"
        ? searchParams.get("userId") || undefined
        : user.id;

    const orders = await getOrdersByUserId(userId!);

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch orders",
      },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}