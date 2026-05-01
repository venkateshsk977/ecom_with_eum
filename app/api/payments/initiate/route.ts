import { NextResponse ,NextRequest} from "next/server";
import { createOnlinePaymentOrder } from "@/modules/payments/payment.service";
import { getUser } from "@/lib/getUser";

export async function POST(request: NextRequest) {
  try {
    const user = getUser(request); // 🔐

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId is required" },
        { status: 400 }
      );
    }

    const payment = await createOnlinePaymentOrder(orderId, user);

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to initiate payment" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}