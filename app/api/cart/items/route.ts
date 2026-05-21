import { NextResponse ,NextRequest } from "next/server";
import { addToCart } from "@/modules/checkout/cart.service";
import { getUser } from "@/lib/getUser";
import { getErrorMessage } from "@/lib/response";

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
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to add item to cart");

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
