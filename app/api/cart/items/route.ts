import { NextResponse ,NextRequest } from "next/server";
import { addToCart } from "@/modules/checkout/cart.service";
import { getUser } from "@/lib/getUser";

export async function POST(request: NextRequest) {
  try {
    const user = getUser(request); // 🔐 source of truth

    const body = await request.json();

    const cart = await addToCart({
      ...body,
      userId: user.id, 
    });

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to add item to cart",
      },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}