import { NextResponse } from "next/server";
import { getProducts } from "@/modules/catalog/product.service";

export async function GET() {
  try {
    const products = await getProducts();

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}