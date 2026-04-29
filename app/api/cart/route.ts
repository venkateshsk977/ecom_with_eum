import { NextResponse } from "next/server";
import { getCartByUserId } from "@/modules/checkout/cart.service";

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

    const cart = await getCartByUserId(userId);

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch cart",
      },
      { status: 500 }
    );
  }
}