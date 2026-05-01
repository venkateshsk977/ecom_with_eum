import { NextResponse ,NextRequest } from "next/server";
import { updateCartItemQuantity,deleteCartItem } from "@/modules/checkout/cart.service";
import { getUser } from "@/lib/getUser";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUser(request); // 🔐

    const { id } = await context.params;
    const body = await request.json();

    const quantity = Number(body.quantity);

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, message: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const item = await updateCartItemQuantity(id, quantity, user);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed" },
      { status: error.message === "Forbidden" ? 403 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUser(request); // 🔐

    const { id } = await context.params;

    await deleteCartItem(id, user);

    return NextResponse.json({
      success: true,
      message: "Cart item removed",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed" },
      { status: error.message === "Forbidden" ? 403 : 500 }
    );
  }
}