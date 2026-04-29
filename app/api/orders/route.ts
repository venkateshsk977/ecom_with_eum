import { NextResponse } from "next/server";
import { createOrderFromCart , getOrdersByUserId } from "@/modules/orders/order.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const order = await createOrderFromCart(body.userId);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
      },
      { status: 500 }
    );
  }
}



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required",
        },
        { status: 400 }
      );
    }

    const orders = await getOrdersByUserId(userId);

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get Orders Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}