import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { getErrorMessage } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const user = getUser(req);

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      code,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      expiresAt,
    } = body;

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type,
        value,
        minOrderAmount,
        maxDiscount,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: coupon,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: getErrorMessage(err) },
      { status: 400 }
    );
  }
}

export async function GET() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: coupons,
  });
}
