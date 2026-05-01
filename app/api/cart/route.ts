import { NextResponse ,NextRequest} from "next/server";
import { getCartByUserId } from "@/modules/checkout/cart.service";
import { getUser } from "@/lib/getUser";

export async function GET(request: NextRequest) {
  try {
    const user = getUser(request); // 🔐 source of truth

    const cart = await getCartByUserId(user.id);

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch cart",
      },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}