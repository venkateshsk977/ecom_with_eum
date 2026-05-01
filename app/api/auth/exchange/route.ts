import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { eumId, email, fullName } = body;

    if (!eumId) {
      return NextResponse.json(
        { message: "Invalid identity" },
        { status: 400 }
      );
    }

    // 🔍 find or create user
    let user = await prisma.user.findUnique({
      where: { eumId },
      include: { role: true },
    });

    if (!user) {
      // default role
      const role = await prisma.role.findFirst({
        where: { name: "USER" },
      });

      user = await prisma.user.create({
        data: {
          eumId,
          email,
          fullName,
          roleId: role!.id,
        },
        include: { role: true },
      });
    }

    // 🔐 issue JWT
  const token = signToken({
  id: user.id,
  role: user.role.name, // ✅ THIS is the change
});

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Auth exchange failed" },
      { status: 500 }
    );
  }
}