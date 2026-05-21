import { NextRequest, NextResponse } from "next/server";
import { getUser, JwtUser } from "./getUser";
import { getErrorMessage } from "./response";

export function withAuth(
  handler: (req: NextRequest, user: JwtUser, context?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, context: unknown) => {
    try {
      const user = getUser(req);
      return handler(req, user, context);
    } catch (err: unknown) {
      return NextResponse.json(
        { error: getErrorMessage(err) },
        { status: 401 }
      );
    }
  };
}
