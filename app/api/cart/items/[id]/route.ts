import { NextResponse } from "next/server";
import { updateCartItemQuantity,deleteCartItem } from "@/modules/checkout/cart.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const quantity = Number(body.quantity);

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be at least 1",
        },
        { status: 400 }
      );
    }

    const item = await updateCartItemQuantity(id, quantity);

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Update Cart Item Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update cart item",
      },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await deleteCartItem(id);

    return NextResponse.json({
      success: true,
      message: "Cart item removed",
    });
  } catch (error) {
    console.error("Delete Cart Item Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete cart item",
      },
      { status: 500 }
    );
  }
}