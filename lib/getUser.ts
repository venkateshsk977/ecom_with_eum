import { NextRequest } from "next/server";

export type JwtUser = {
  id: string;
  role: string;
};
export function getUser(req: NextRequest): JwtUser {
  const userHeader = req.headers.get("x-user");

  if (!userHeader) {
    throw new Error("Unauthorized");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(userHeader);
  } catch {
    throw new Error("Invalid user data");
  }

  // 🔒 Runtime validation
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as any).id !== "string" ||
    !["ADMIN", "USER"].includes((parsed as any).role)
  ) {
    throw new Error("Invalid user payload");
  }

  return parsed as JwtUser;
}