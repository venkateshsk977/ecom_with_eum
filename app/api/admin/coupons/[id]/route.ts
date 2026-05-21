import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { getErrorMessage } from "@/lib/response";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = getUser(req);

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...body,
        expiresAt: body.expiresAt
          ? new Date(body.expiresAt)
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: getErrorMessage(err) },
      { status: 400 }
    );
  }
}
