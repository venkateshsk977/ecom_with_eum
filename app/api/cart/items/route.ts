import { NextResponse } from "next/server";
import { addToCart } from "@/modules/checkout/cart.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const cart = await addToCart(body);

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Add To Cart Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add item to cart",
      },
      { status: 500 }
    );
  }
}