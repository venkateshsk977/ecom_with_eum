import { NextResponse ,NextRequest} from "next/server";
import { cancelOrder } from "@/modules/orders/order.service";
import { getUser } from "@/lib/getUser";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUser(request);
    const { id } = await context.params;

    const order = await cancelOrder(id, user);

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.message === "Forbidden" ? 403 : 400 }
    );
  }
}