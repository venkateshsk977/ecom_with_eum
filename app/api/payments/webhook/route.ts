import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Webhook disabled. System currently supports COD only.",
    },
    { status: 501 } // Not Implemented
  );
}