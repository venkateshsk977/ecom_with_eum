import { NextResponse ,NextRequest} from "next/server";
import { cancelOrder } from "@/modules/orders/order.service";
import { getUser } from "@/lib/getUser";
import { getErrorMessage } from "@/lib/response";

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
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    return NextResponse.json(
      { success: false, message },
      { status: message === "Forbidden" ? 403 : 400 }
    );
  }
}
