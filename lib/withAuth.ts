import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./getUser";

export function withAuth(
  handler: (req: NextRequest, user: any, context?: any) => Promise<Response>
) {
  return async (req: NextRequest, context: any) => {
    try {
      const user = getUser(req);
      return handler(req, user, context);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message },
        { status: 401 }
      );
    }
  };
}