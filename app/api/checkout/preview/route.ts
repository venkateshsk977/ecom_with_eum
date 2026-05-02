import { NextResponse , NextRequest} from "next/server";
import { computePricing } from "@/modules/checkout/checkout.service";
import { getUser } from "@/lib/getUser";

export async function GET(req: NextRequest) {
  try {
    const user = getUser(req);

    const { searchParams } = new URL(req.url);
    const couponCode = searchParams.get("coupon") || undefined;

    const preview = await computePricing(user.id, undefined, couponCode);

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }
}