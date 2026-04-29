import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/modules/orders/order.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const status = body.status;

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          message: "status is required",
        },
        { status: 400 }
      );
    }

    const order = await updateOrderStatus(id, status);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update order status",
      },
      { status: 500 }
    );
  }
}