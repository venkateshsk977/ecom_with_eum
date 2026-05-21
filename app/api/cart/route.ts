import { NextResponse ,NextRequest} from "next/server";
import { getCartByUserId } from "@/modules/checkout/cart.service";
import { getUser } from "@/lib/getUser";
import { getErrorMessage } from "@/lib/response";

export async function GET(request: NextRequest) {
  try {
    const user = getUser(request); // 🔐 source of truth

    const cart = await getCartByUserId(user.id);

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Failed to fetch cart");

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}
