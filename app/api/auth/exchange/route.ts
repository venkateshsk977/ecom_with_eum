import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { email, fullName, eumId } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // 🔍 find existing user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(eumId ? [{ eumId }] : []),
        ],
      },
      include: {
        role: true,
      },
    });

    // 🆕 create if not exists
    if (!user) {
      const defaultRole = await prisma.role.findUnique({
        where: { name: "USER" },
      });

      if (!defaultRole) {
        throw new Error("Default role not found");
      }

      user = await prisma.user.create({
        data: {
          email,
          fullName: fullName || "User",
          eumId: eumId || null,
          roleId: defaultRole.id,
        },
        include: {
          role: true,
        },
      });
    }

    // 🔐 generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role.name, // 👈 IMPORTANT
      },
      SECRET,
      {
        expiresIn: "7d",
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role.name,
        },
      },
    });
  } catch (err: any) {
    console.error("Auth exchange error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to authenticate",
      },
      { status: 500 }
    );
  }
}